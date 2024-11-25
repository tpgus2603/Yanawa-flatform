
const { Meeting, MeetingParticipant, User, Schedule } = require('../models');
const ChatRoom = require('../models/chatRooms');
const FcmToken = require('../models/fcmToken');
const MeetingResponseDTO = require('../dtos/MeetingResponseDTO');
const MeetingDetailResponseDTO = require('../dtos/MeetingDetailResponseDTO');
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');
const ScheduleService = require('./scheduleService'); // ScheduleService 임포트
const chatService = require('./chatService');

class MeetingService {
    /**
     * 번개 모임 생성
     * @returns 생성된 모임 ID와 채팅방 ID
     */
    async createMeeting(meetingData) {
        const createMeetingDTO = new CreateMeetingRequestDTO(meetingData);
        createMeetingDTO.validate();

        const { title, description, start_time, end_time, location, deadline, type, created_by } = meetingData;

        // 사용자와 FCM 토큰 조회
        const user = await this._findUserWithFcmTokens(created_by);
        const userFcmTokens = user.fcmTokenList.map((fcmToken) => fcmToken.token);

        // 스케줄 충돌 확인
        const hasConflict = await ScheduleService.checkScheduleOverlap(
            created_by,
            new Date(start_time),
            new Date(end_time)
        );

        if (hasConflict) {
            throw new Error('스케줄이 겹칩니다. 다른 시간을 선택해주세요.');
        }

        // 트랜잭션을 사용하여 모임 생성과 스케줄 추가를 원자적으로 처리
        return await Meeting.sequelize.transaction(async (transaction) => {
            const chatRoomData = this._constructChatRoomData(title, user, userFcmTokens);
            const chatRoomResponse = await chatService.createChatRoom(chatRoomData);

            if (!chatRoomResponse.success) {
                throw new Error('채팅방 생성 실패');
            }

            const chatRoomId = chatRoomResponse.chatRoomId;

            const newMeeting = await Meeting.create({
                title,
                description,
                start_time,
                end_time,
                location,
                deadline,
                type,
                created_by,
                chatRoomId,
            }, { transaction });

            await MeetingParticipant.create({
                meeting_id: newMeeting.id,
                user_id: created_by,
            }, { transaction });

            await ScheduleService.createSchedule({
                userId: created_by,
                title: `번개 모임: ${title}`,
                start_time: new Date(start_time),
                end_time: new Date(end_time),
                is_fixed: true,
            });

            const chatRoom = await ChatRoom.findOne({ chatRoomId: chatRoomId });

            if (chatRoom) {
                console.log("채팅방 찾음");
                this._addParticipantToChatRoom(chatRoom, user, userFcmTokens);
            }

            return { meeting_id: newMeeting.id, chatRoomId };
        });
    }

    /**
     * 번개 모임 목록 조회
     * @return 모임 목록 DTO 배열
     */
    async getMeetings(userId) {
        const meetings = await Meeting.findAll({
            attributes: ['id', 'title', 'description', 'start_time', 'end_time', 'location', 'deadline', 'type'],
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
                false, // isScheduleConflict: 필요 시 추가 로직 구현
                creatorName
            );
        });
    }

    /**
     * 번개 모임 참가
     */
    async joinMeeting(meetingId, userId) {
        const meeting = await Meeting.findByPk(meetingId);

        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }

        if (meeting.type === 'CLOSE') {
            throw new Error('이미 마감된 모임입니다.');
        }

        if (new Date() > new Date(meeting.deadline)) {
            throw new Error('참가 신청이 마감되었습니다.');
        }

        const existingParticipant = await MeetingParticipant.findOne({ 
            where: { meeting_id: meetingId, user_id: userId } 
        });

        if (existingParticipant) {
            throw new Error('이미 참가한 사용자입니다.');
        }

        await Meeting.sequelize.transaction(async (transaction) => {
            const hasConflict = await ScheduleService.checkScheduleOverlap(
                userId,
                new Date(meeting.start_time),
                new Date(meeting.end_time)
            );
            if (hasConflict) {
                throw new Error('스케줄이 겹칩니다. 다른 모임에 참가하세요.');
            }

            await MeetingParticipant.create({ meeting_id: meetingId, user_id: userId }, { transaction });

            await ScheduleService.createSchedule({
                userId,
                title: `번개 모임: ${meeting.title}`,
                start_time: new Date(meeting.start_time),
                end_time: new Date(meeting.end_time),
                is_fixed: true,
            });

            // 사용자와 FCM 토큰 조회
            const user = await this._findUserWithFcmTokens(userId);
            const userFcmTokens = user.fcmTokenList.map((fcmToken) => fcmToken.token);

            const chatRoom = await ChatRoom.findOne({ chatRoomId: meeting.chatRoomId });

            if (chatRoom) {
                console.log("채팅방 찾음");
                this._addParticipantToChatRoom(chatRoom, user, userFcmTokens);
            }
        });
    }

    /**
     * 번개 모임 상세 조회
     * @return 모임 상세 DTO
     */
    async getMeetingDetail(meetingId) {
        const meeting = await Meeting.findByPk(meetingId, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name'],
                },
                {
                    model: MeetingParticipant,
                    as: 'participants',
                    include: [
                        {
                            model: User,
                            as: 'participantUser',
                            attributes: ['name', 'email'],
                        },
                    ],
                },
            ],
        });

        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }

        return new MeetingDetailResponseDTO(meeting);
    }

    /**
     * 번개 모임 마감
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

    // Helper functions
    async _findUserWithFcmTokens(userId) {
        const user = await User.findOne({
            where: { id: userId },
            include: [
                {
                    model: FcmToken,
                    as: 'fcmTokenList',
                    attributes: ['token'],
                },
            ],
        });

        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        return user;
    }

    _constructChatRoomData(title, user, userFcmTokens) {
        return {
            meeting_id: null,
            participants: [
                {
                    name: user.name,
                    fcmTokens: userFcmTokens || [],
                    isOnline: true,
                    lastReadAt: new Date(),
                    lastReadLogId: null,
                },
            ],
            chatRoomName: title,
        };
    }

    _addParticipantToChatRoom(chatRoom, user, userFcmTokens) {
        // Map 필드가 초기화되지 않은 경우 기본값 설정
        if (!chatRoom.isOnline) chatRoom.isOnline = new Map();
        if (!chatRoom.lastReadAt) chatRoom.lastReadAt = new Map();
        if (!chatRoom.lastReadLogId) chatRoom.lastReadLogId = new Map();

        // 참가자 추가 로직
        if (!chatRoom.participants.some(participant => participant.name === user.name)) {
            chatRoom.participants.push({ name: user.name, fcmTokens: userFcmTokens });
            chatRoom.isOnline.set(user.name, true);
            chatRoom.lastReadAt.set(user.name, new Date());
            chatRoom.lastReadLogId.set(user.name, null);
        }

        // 저장
        chatRoom.save();
    }
}

module.exports = new MeetingService();