// services/meetingService.js
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize'); // 트랜잭션 관리를 위해 sequelize 인스턴스 필요
const { Meeting, MeetingParticipant, User, Schedule, Invite, Friend } = require('../models');
const ChatRooms = require('../models/ChatRooms');
const MeetingResponseDTO = require('../dtos/MeetingResponseDTO');
const MeetingDetailResponseDTO = require('../dtos/MeetingDetailResponseDTO');
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');
const ScheduleService = require('./scheduleService');

class MeetingService {
    /**
     * 현재 시간을 time_idx로 변환하는 유틸리티 함수
     * 월요일부터 일요일까지 15분 단위로 타임 인덱스를 할당
     * 현재 시간의 타임 인덱스 (0 ~ 671)
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

    async createMeeting(meetingData) {
        // DTO를 사용하여 요청 데이터 검증
        const createMeetingDTO = new CreateMeetingRequestDTO(meetingData);
        createMeetingDTO.validate();

        const {
            title,
            description,
            time_idx_start,
            time_idx_end,
            location,
            time_idx_deadline,
            type,
            created_by,
            max_num,
        } = meetingData;

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
                isOnline: {},
            };
            const chatRoom = new ChatRooms(chatRoomData);
            await chatRoom.save();

            // 모임 생성
            const newMeeting = await Meeting.create(
                {
                    title,
                    description,
                    time_idx_start,
                    time_idx_end,
                    location,
                    time_idx_deadline,
                    type,
                    created_by,
                    chatRoomId,
                    max_num, // max_num 추가
                    cur_num: 1, // 생성자 자신 포함
                },
                { transaction }
            );

            // 모임 참가자 추가 (생성자 자신)
            await MeetingParticipant.create(
                {
                    meeting_id: newMeeting.id,
                    user_id: created_by,
                },
                { transaction }
            );

            // 스케줄 생성 (모임 시간 범위 내 모든 time_idx에 대해 생성)
            const events = [];
            for (let idx = time_idx_start; idx <= time_idx_end; idx++) {
                events.push({ time_idx: idx });
            }
            await ScheduleService.createSchedules(
                {
                    userId: created_by,
                    title: `번개 모임: ${title}`,
                    is_fixed: false,
                    events: events,
                },
                transaction
            );

            // 친구 초대 로직 호출
            const invitedFriendIds = await this.sendInvites({
                meetingId: newMeeting.id,
                creatorId: created_by,
                time_idx_start,
                time_idx_end,
            }, transaction);

            return { meeting_id: newMeeting.id, chatRoomId, invitedFriendIds };
        });

        return result;
    }

    async sendInvites({ meetingId, creatorId, time_idx_start, time_idx_end }, transaction) {
        // 1. 친구 목록 가져오기 (ACCEPTED 상태)
        const friends = await Friend.findAll({
            where: {
                [Op.or]: [
                    { requester_id: creatorId, status: 'ACCEPTED' },
                    { receiver_id: creatorId, status: 'ACCEPTED' },
                ],
            },
            transaction,
        });

        const friendIds = friends.map(friend =>
            friend.requester_id === creatorId ? friend.receiver_id : friend.requester_id
        );

        if (friendIds.length === 0) {
            // 친구가 없거나 모든 친구가 초대받지 못함
            return [];
        }
        const schedules = await Schedule.findAll({
            where: {
                user_id: { [Op.in]: friendIds },
                time_idx: {
                    [Op.between]: [time_idx_start, time_idx_end],
                },
            },
            transaction,
        });

        // 스케줄이 겹치는 친구 ID를 추출
        const conflictedFriendIds = schedules.map(schedule => schedule.user_id);

        // 스케줄이 겹치지 않는 친구 ID 필터링
        const availableFriendIds = friendIds.filter(friendId => !conflictedFriendIds.includes(friendId));

        if (availableFriendIds.length === 0) {
            // 스케줄이 겹치는 친구가 모두 있음
            return [];
        }
        const invitePromises = availableFriendIds.map(inviteeId => {
            return Invite.create({
                meeting_id: meetingId,
                inviter_id: creatorId,
                invitee_id: inviteeId,
                status: 'PENDING',
            }, { transaction });
        });

        await Promise.all(invitePromises);

        return availableFriendIds;
    }

  
    async joinMeeting(meetingId, userId) {
        const meeting = await Meeting.findByPk(meetingId);
        console.log(`참여하려는 모임: ${JSON.stringify(meeting)}`);
        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }
        if (meeting.type === 'CLOSE') {
            throw new Error('이미 마감된 모임입니다.');
        }
        if (meeting.time_idx_deadline !== undefined) {
            const currentTimeIdx = this.getCurrentTimeIdx(); // 현재 시간 인덱스
            if (currentTimeIdx >= meeting.time_idx_deadline) {
                throw new Error('참가 신청이 마감되었습니다.');
            }
        }
        const existingParticipant = await MeetingParticipant.findOne({
            where: { meeting_id: meetingId, user_id: userId },
        });
        if (existingParticipant) {
            throw new Error('이미 참가한 사용자입니다.');
        }

        // 트랜잭션을 사용하여 참가자 추가 및 스케줄 업데이트를 원자적으로 처리
        await sequelize.transaction(async (transaction) => {
          if (meeting.cur_num >= meeting.max_num) {
            throw new Error("모임 인원이 모두 찼습니다.");
          }
          // 스케줄 충돌 확인
          const hasConflict = await ScheduleService.checkScheduleOverlapByTime(
            userId,
            meeting.time_idx_start,
            meeting.time_idx_end,
            transaction
          );
          console.log(`스케줄 충돌 결과: ${hasConflict}`);
          if (hasConflict) {
            throw new Error("스케줄이 겹칩니다. 다른 모임에 참가하세요.");
          }

          await MeetingParticipant.create(
            { meeting_id: meetingId, user_id: userId },
            { transaction }
          );

          // 스케줄 생성 (모임 시간 범위 내 모든 time_idx에 대해 생성)
          const events = [];
          for (
            let idx = meeting.time_idx_start;
            idx <= meeting.time_idx_end;
            idx++
          ) {
            events.push({ time_idx: idx });
          }
          await ScheduleService.createSchedules(
            {
              userId: userId,
              title: `번개 모임: ${meeting.title}`,
              is_fixed: true,
              events: events,
            },
            transaction
          );

          // 채팅방 참가 (MongoDB)
          const user = await User.findOne({
            where: { id: userId },
            transaction,
          });
          const chatRoom = await ChatRooms.findOne({
            chatRoomId: meeting.chatRoomId,
          });
          if (chatRoom && !chatRoom.participants.includes(user.name)) {
            chatRoom.participants.push(user.name);
            chatRoom.isOnline.set(user.name, true);
            chatRoom.lastReadAt.set(user.name, new Date());
            chatRoom.lastReadLogId.set(user.name, null);
            await chatRoom.save();
          }

          // 현재 인원 수 증가
          await meeting.increment("cur_num", { by: 1, transaction });
        });
    }

    
    async getMeetings(userId) {
        const meetings = await Meeting.findAll({
            attributes: [
                'id',
                'title',
                'description',
                'time_idx_start',
                'time_idx_end',
                'location',
                'time_idx_deadline',
                'type',
                'max_num',
                'cur_num',
            ],
            include: [
                {
                    model: MeetingParticipant,
                    as: 'participants',
                    where: { user_id: userId }, // userId와 매핑된 미팅만 가져옴
                    attributes: [], 
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name'], // 미팅 생성자의 이름만 필요
                },
            ],
        });

        return meetings.map((meeting) => {
            const creatorName = meeting.creator ? meeting.creator.name : 'Unknown';
            return new MeetingResponseDTO(meeting, true, false, creatorName);
        });
    }

  
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

  
    async joinMeeting(meetingId, userId) {
        const meeting = await Meeting.findByPk(meetingId);
        console.log(`참여하려는 모임: ${JSON.stringify(meeting)}`);
        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }
        if (meeting.type === 'CLOSE') {
            throw new Error('이미 마감된 모임입니다.');
        }
        if (meeting.time_idx_deadline !== undefined) {
            const currentTimeIdx = this.getCurrentTimeIdx(); // 현재 시간 인덱스
            if (currentTimeIdx >= meeting.time_idx_deadline) {
                throw new Error('참가 신청이 마감되었습니다.');
            }
        }
        const existingParticipant = await MeetingParticipant.findOne({
            where: { meeting_id: meetingId, user_id: userId },
        });
        if (existingParticipant) {
            throw new Error('이미 참가한 사용자입니다.');
        }

        // 트랜잭션을 사용하여 참가자 추가 및 스케줄 업데이트를 원자적으로 처리
        await sequelize.transaction(async (transaction) => {
          // 스케줄 충돌 확인
          // 현재 인원 수 확인
          if (meeting.cur_num >= meeting.max_num) {
            throw new Error("모임 인원이 모두 찼습니다.");
          }

          const hasConflict = await ScheduleService.checkScheduleOverlapByTime(
            userId,
            meeting.time_idx_start,
            meeting.time_idx_end,
            transaction
          );
          console.log(`스케줄 충돌 결과: ${hasConflict}`);
          if (hasConflict) {
            throw new Error("스케줄이 겹칩니다. 다른 모임에 참가하세요.");
          }

          // 참가자 추가
          await MeetingParticipant.create(
            { meeting_id: meetingId, user_id: userId },
            { transaction }
          );

          // 스케줄 생성 (모임 시간 범위 내 모든 time_idx에 대해 생성)
          const events = [];
          for (
            let idx = meeting.time_idx_start;
            idx <= meeting.time_idx_end;
            idx++
          ) {
            events.push({ time_idx: idx });
          }
          await ScheduleService.createSchedules(
            {
              userId: userId,
              title: `번개 모임: ${meeting.title}`,
              is_fixed: true,
              events: events,
            },
            transaction
          );

          // 채팅방 참가 (MongoDB)
          const user = await User.findOne({
            where: { id: userId },
            transaction,
          });
          const chatRoom = await ChatRooms.findOne({
            chatRoomId: meeting.chatRoomId,
          });
          if (chatRoom && !chatRoom.participants.includes(user.name)) {
            chatRoom.participants.push(user.name);
            chatRoom.isOnline.set(user.name, true);
            chatRoom.lastReadAt.set(user.name, new Date());
            chatRoom.lastReadLogId.set(user.name, null);
            await chatRoom.save();
          }

          // 현재 인원 수 증가
          await meeting.increment("cur_num", { by: 1, transaction });
        });
    }

    
    async getMeetingDetail(meetingId) {
        const meeting = await Meeting.findByPk(meetingId, {
            include: [
                {
                    model: User,
                    as: "creator",
                    attributes: ["name"],
                },
                {
                    model: MeetingParticipant,
                    as: "participants",
                    include: [
                        {
                            model: User,
                            as: "user", // 'participantUser'에서 'user'로 수정
                            attributes: ["name", "email"],
                        },
                    ],
                },
            ],
        });

        if (!meeting) {
            throw new Error("모임을 찾을 수 없습니다.");
        }

        return new MeetingDetailResponseDTO(meeting);
    }
}

module.exports = new MeetingService();
