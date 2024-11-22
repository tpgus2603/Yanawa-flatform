// services/meetingService.js
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize'); // 트랜잭션 관리를 위해 sequelize 인스턴스 필요
const { Meeting, MeetingParticipant, User, Schedule } = require('../models');
const ChatRooms = require('../models/ChatRooms'); 
const MeetingResponseDTO = require('../dtos/MeetingResponseDTO');
const MeetingDetailResponseDTO = require('../dtos/MeetingDetailResponseDTO');
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');
const ScheduleService = require('./scheduleService'); 

class MeetingService {
    /**
     * 현재 시간을 time_idx로 변환하는 유틸리티 함수
     * 월요일부터 일요일까지 15분 단위로 타임 인덱스를 할당
     *  현재 시간의 타임 인덱스 (0 ~ 671)
     */
    getCurrentTimeIdx() {
        const today = new Date();
        const jsDayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        const adjustedDayOfWeek = (jsDayOfWeek + 6) % 7; // 0=Monday, ..., 6=Sunday
        const hours = today.getHours();
        const minutes = today.getMinutes();
        const timeIdx = hours * 4 + Math.floor(minutes / 15); // 15분 단위 인덱스
        const totalIdx = adjustedDayOfWeek * 96 + timeIdx; // 주 전체 인덱스
        return totalIdx;
    }

    /**
     * 번개 모임 생성
     * @param {object} meetingData - 모임 생성 데이터
     * @returns {Promise<object>} - 생성된 모임 ID와 채팅방 ID
     */
    async createMeeting(meetingData) {
        // DTO를 사용하여 요청 데이터 검증
        const createMeetingDTO = new CreateMeetingRequestDTO(meetingData);
        createMeetingDTO.validate();

        const { title, description, time_idx_start, time_idx_end, location, time_idx_deadline, type, created_by } = meetingData;

        // 사용자 존재 여부 확인
        const user = await User.findOne({ where: { id: created_by } });
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        // 트랜잭션을 사용하여 모임 생성과 스케줄 추가를 원자적으로 처리
        const result = await sequelize.transaction(async (transaction) => {
            // 채팅방 생성 (MongoDB)
            const chatRoomId = uuidv4(); // 고유한 채팅방 ID 생성
            const chatRoomData = {
                chatRoomId,
                participants: [user.name],
                messages: [],
                lastReadAt: {},
                lastReadLogId: {},
                isOnline: {}
            };
            const chatRoom = new ChatRooms(chatRoomData);
            await chatRoom.save();

            // 모임 생성
            const newMeeting = await Meeting.create({
                title,
                description,
                time_idx_start,
                time_idx_end,
                location,
                time_idx_deadline,
                type,
                created_by,
                chatRoomId,
            }, { transaction });

            // 모임 참가자 추가 (생성자 자신)
            await MeetingParticipant.create({
                meeting_id: newMeeting.id,
                user_id: created_by,
            }, { transaction });

            // 스케줄 생성
            await ScheduleService.createSchedules({
                userId: created_by,
                title: `번개 모임: ${title}`,
                is_fixed: true,
                events: [
                    { time_idx: time_idx_start },
                    { time_idx: time_idx_end },
                ],
            }, transaction);

            return { meeting_id: newMeeting.id, chatRoomId };
        });

        return result;
    }

    /**
     * 번개 모임 목록 조회
     * @param {number} userId - 사용자 ID
     * @returns {Promise<Array<MeetingResponseDTO>>} - 모임 목록 DTO 배열
     */
    async getMeetings(userId) {
        const meetings = await Meeting.findAll({
            attributes: ['id', 'title', 'description', 'time_idx_start', 'time_idx_end', 'location', 'time_idx_deadline', 'type'],
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name'],
                },
                {
                    model: MeetingParticipant,
                    as: 'participants',
                    attributes: ['user_id'],
                },
            ],
        });

        return meetings.map((meeting) => {
            const creatorName = meeting.creator ? meeting.creator.name : 'Unknown';
            const isParticipant = meeting.participants.some(participant => participant.user_id === parseInt(userId, 10));

            return new MeetingResponseDTO(
                meeting,
                isParticipant,
                false, 
                creatorName
            );
        });
    }

    /**
     * 번개 모임 마감
     * @param {number} meetingId - 모임 ID
     * @returns {Promise<Meeting>} - 마감된 모임 객체
     */
    async closeMeeting(meetingId) {
        const meeting = await Meeting.findByPk(meetingId);
        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }

        if (meeting.type === 'CLOSE') {
            throw new Error('이미 마감된 모임입니다.');
        }

        meeting.type = 'CLOSE';
        await meeting.save();
        return meeting;
    }

    /**
     * 번개 모임 참가
     * @param {number} meetingId - 모임 ID
     * @param {number} userId - 사용자 ID
     * @returns {Promise<void>}
     */
    async joinMeeting(meetingId, userId) {
        const meeting = await Meeting.findByPk(meetingId);
        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }

        if (meeting.type === 'CLOSE') {
            throw new Error('이미 마감된 모임입니다.');
        }

        if (meeting.time_idx_deadline !== undefined) {
            const currentTimeIdx = this.getCurrentTimeIdx(); // 현재 시간 인덱스
            if (currentTimeIdx > meeting.time_idx_deadline) {
                throw new Error('참가 신청이 마감되었습니다.');
            }
        }

        const existingParticipant = await MeetingParticipant.findOne({
            where: { meeting_id: meetingId, user_id: userId }
        });

        if (existingParticipant) {
            throw new Error('이미 참가한 사용자입니다.');
        }

        // 트랜잭션을 사용하여 참가자 추가 및 스케줄 업데이트를 원자적으로 처리
        await sequelize.transaction(async (transaction) => {
            // 참가자 추가
            await MeetingParticipant.create({ meeting_id: meetingId, user_id: userId }, { transaction });

            // 스케줄 충돌 확인
            const hasConflict = await ScheduleService.checkScheduleOverlapByTime(
                userId,
                meeting.time_idx_start,
                meeting.time_idx_end,
                transaction
            );
            if (hasConflict) {
                throw new Error('스케줄이 겹칩니다. 다른 모임에 참가하세요.');
            }

            // 스케줄 추가
            await ScheduleService.createSchedules({
                userId: userId,
                title: `번개 모임: ${meeting.title}`,
                is_fixed: true,
                events: [
                    { time_idx: meeting.time_idx_start },
                    { time_idx: meeting.time_idx_end },
                ],
            }, transaction);

            // 채팅방 참가 (MongoDB)
            const user = await User.findOne({ where: { id: userId }, transaction });
            const chatRoom = await ChatRooms.findOne({ chatRoomId: meeting.chatRoomId });

            if (chatRoom && !chatRoom.participants.includes(user.name)) {
                chatRoom.participants.push(user.name);
                chatRoom.isOnline.set(user.name, true);
                chatRoom.lastReadAt.set(user.name, new Date());
                chatRoom.lastReadLogId.set(user.name, null);
                await chatRoom.save(); 
            }
        });
    }

    /**
     * 번개 모임 상세 조회
     * @param {number} meetingId - 모임 ID
     * @returns {Promise<MeetingDetailResponseDTO>} - 모임 상세 DTO
     */
    async getMeetingDetail(meetingId) {
        const meeting = await Meeting.findByPk(meetingId, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                },
                {
                    model: MeetingParticipant,
                    as: 'participants',
                    include: [
                        {
                            model: User,
                            as: 'participantUser',
                            attributes: ['name', 'email']
                        }
                    ]
                }
            ]
        });

        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }

        return new MeetingDetailResponseDTO(meeting);
    }
}

module.exports = new MeetingService();
