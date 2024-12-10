
// services/meetingService.js
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize'); // 트랜잭션 관리를 위해 sequelize 인스턴스 필요
const { Meeting, MeetingParticipant, User, Schedule, Invite, Friend, FcmToken } = require('../models');
const ChatRooms = require('../schemas/chatRooms');
const MeetingResponseDTO = require('../dtos/MeetingResponseDTO');
const MeetingDetailResponseDTO = require('../dtos/MeetingDetailResponseDTO');
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');
const ScheduleService = require('./scheduleService'); // ScheduleService 임포트
const chatService = require('./chatService');
const amqp = require('amqplib'); // RabbitMQ 연결

class MeetingService {

    async publishToQueue(queue, message) {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
        console.log(`Message sent to queue ${queue}:`, message);
        setTimeout(() => connection.close(), 500); // 연결 닫기
    }

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

    // async sendMeetingPushNotificationRequest(meetingTitle, inviterName, inviteeTokens) {
    //     const event = {
    //         meetingTitle,
    //         inviterName,
    //         inviteeTokens,
    //     };
    //     await this.publishToQueue('meeting_push_notifications', event); // meeting_push_notifications 큐에 메시지 발행
    // }
    async sendMeetingPushNotificationRequest(meetingTitle, inviterName, inviteeTokens, type) {
        const event = {
            meetingTitle,
            inviterName,
            inviteeTokens,
            type, // 이벤트 타입 ('invite' 또는 'join')
        };
        await this.publishToQueue('meeting_push_notifications', event); // 큐에 메시지 발행
    }


    async createMeeting(meetingData) {
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

        // 사용자와 FCM 토큰 조회
        const user = await this._findUserWithFcmTokens(created_by);
        console.log("user", user);
        const userFcmTokens = user.fcmTokenList.map((fcmToken) => fcmToken.token);


        const hasConflict = await ScheduleService.checkScheduleOverlapByTime(
            created_by,
            time_idx_start,
            time_idx_end
        );
        if (hasConflict) {
            throw new Error('해당 시간에 이미 다른 스케줄이 있습니다.');
        }

        // 트랜잭션을 사용하여 모임 생성과 스케줄 추가를 원자적으로 처리
        return await Meeting.sequelize.transaction(async (transaction) => {
            const chatRoomData = this._constructChatRoomData(title, user, userFcmTokens);
            const chatRoomResponse = await chatService.createChatRoom(chatRoomData);

            if (!chatRoomResponse.success) {
                throw new Error('채팅방 생성 실패');
            }

            const chatRoomId = chatRoomResponse.chatRoomId;

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

            const time_indices = Array.from(
                { length: parseInt(time_idx_end) - parseInt(time_idx_start) + 1 },
                (_, i) => (parseInt(time_idx_start) + i).toString()
            );
            await ScheduleService.createSchedules({
                userId: created_by,
                title: `번개 모임: ${title}`,
                is_fixed: false,
                time_indices: time_indices,
            }, transaction);

            // 친구 초대 로직 호출
            const invitedFriendIds = await this.sendInvites({
                meetingId: newMeeting.id,
                creatorId: created_by,
                time_idx_start,
                time_idx_end,
            }, transaction);

            // 친구 목록에서 FCM 토큰 추출
            const inviteeTokens = await FcmToken.findAll({
                where: {
                    userId: { [Op.in]: invitedFriendIds },
                },
                attributes: ['token'],
            }).then(tokens => tokens.map(token => token.token));

            // RabbitMQ 메시지 발행 (푸시 알림 요청)
            if (inviteeTokens.length > 0) {
                await this.sendMeetingPushNotificationRequest(
                    title,
                    user.name,
                    inviteeTokens,
                    'invite'
                );
            }

            const chatRoom = await ChatRooms.findOne({ chatRoomId: chatRoomId });

            if (chatRoom) {
                console.log("채팅방 찾음");
                this._addParticipantToChatRoom(chatRoom, user, userFcmTokens);
            }

            return { meeting_id: newMeeting.id, chatRoomId, invitedFriendIds };
        });
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

            const time_indices = Array.from(
                { length: meeting.time_idx_end - meeting.time_idx_start + 1 },
                (_, i) => meeting.time_idx_start + i
            );

            await ScheduleService.createSchedules({
                userId: userId,
                title: `번개 모임: ${meeting.title}`,
                is_fixed: false,
                time_indices: time_indices,
            }, transaction);

            // 채팅방 참가 (MongoDB)
            const user = await User.findOne({
                where: { id: userId },
                include: [
                    {
                        model: FcmToken,
                        as: 'fcmTokenList', // FCM 토큰 가져오기
                        attributes: ['token'],
                    },
                ],
                transaction
            });

            const userFcmTokens = user.fcmTokenList.map((token) => token.token);

            const chatRoom = await ChatRooms.findOne({
                chatRoomId: meeting.chatRoomId,
            });

            console.log("여기까지");
            console.log("user.name", user.name);
            console.log("참가하는 유저 fcm", userFcmTokens);
            if (chatRoom && !chatRoom.participants.includes(user.name)) {
                // 참가자 추가
                chatRoom.participants.push({
                    name: user.name,
                    fcmTokens: userFcmTokens, // FCM 토큰 추가
                });
                chatRoom.isOnline.set(user.name, false);
                chatRoom.lastReadAt.set(user.name, new Date());
                chatRoom.lastReadLogId.set(user.name, null);

                const joinMessage = {
                    message: `${user.name}님이 참가했습니다.`,
                    timestamp: new Date(),
                    type: 'join'
                };

                chatRoom.messages.push(joinMessage);

                // 기존 참가자 FCM 토큰 가져오기
                const otherParticipants = chatRoom.participants.filter(participant => participant.name !== user.name);
                const otherParticipantTokens = otherParticipants.flatMap(participant => participant.fcmTokens);

                if (otherParticipantTokens.length > 0) {
                    // RabbitMQ 메시지 발행
                    await this.sendMeetingPushNotificationRequest(
                        meeting.title,
                        user.name,
                        otherParticipantTokens,
                        'join'
                    );
                }

                await chatRoom.save();
            }

            // 현재 인원 수 증가
            await meeting.increment("cur_num", { by: 1, transaction });
        });
    }


    async getMeetings(userId, pagination) {
        const { limit = 20, offset = 0 } = pagination;

        try {
            const meetings = await Meeting.findAll({
                attributes: [
                    'id', 'title', 'description',
                    'time_idx_start', 'time_idx_end',
                    'location', 'time_idx_deadline',
                    'type', 'max_num', 'cur_num',
                    'created_at'
                ],
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['name'],
                        required: false
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: limit + 1,
                offset,
                distinct: true
            });

            const hasNext = meetings.length > limit;
            const content = await Promise.all(
                meetings.slice(0, limit).map(async (meeting) => {
                    const isParticipant = await MeetingParticipant.findOne({
                        where: {
                            meeting_id: meeting.id,
                            user_id: userId
                        }
                    });

                    const hasConflict = await ScheduleService.checkScheduleOverlapByTime(
                        userId,
                        meeting.time_idx_start,
                        meeting.time_idx_end
                    );

                    return new MeetingResponseDTO(
                        meeting,
                        !!isParticipant,
                        hasConflict,
                        meeting.creator?.name || 'Unknown'
                    );
                })
            );

            return { content, hasNext };
        } catch (error) {
            console.error('getMeetings error:', error);
            throw new Error('Failed to fetch meetings');
        }
    }

    async getMyMeetings(userId, pagination) {
        const { limit = 20, offset = 0 } = pagination;

        try {
            const meetings = await Meeting.findAll({
                attributes: [
                    'id', 'title', 'description',
                    'time_idx_start', 'time_idx_end',
                    'location', 'time_idx_deadline',
                    'type', 'max_num', 'cur_num',
                    'created_at'
                ],
                include: [
                    {
                        model: MeetingParticipant,
                        as: 'participants',
                        where: { user_id: userId },
                        required: true
                    },
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['name'],
                        required: false
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: limit + 1,
                offset,
                distinct: true
            });

            const hasNext = meetings.length > limit;
            const content = meetings.slice(0, limit).map(meeting => {
                return new MeetingResponseDTO(
                    meeting,
                    true,  // 참여자로 조회했으므로 항상 true
                    false, // 이미 참여 중인 미팅이므로 충돌 체크 불필요
                    meeting.creator?.name || 'Unknown'
                );
            });

            return { content, hasNext };
        } catch (error) {
            console.error('getMyMeetings error:', error);
            throw new Error('Failed to fetch my meetings');
        }
    }

    async getMeetingDetail(meetingId, userId) {
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
                            as: "user",
                            attributes: ["name", "email"],
                        }
                    ]
                }
            ]
        });

        if (!meeting) {
            throw new Error("모임을 찾을 수 없습니다.");
        }

        const hasConflict = await ScheduleService.checkScheduleOverlapByTime(
            userId,
            meeting.time_idx_start,
            meeting.time_idx_end
        );

        return new MeetingDetailResponseDTO(meeting, hasConflict);
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

    async leaveMeeting(meetingId, userId) {
        const meeting = await Meeting.findByPk(meetingId);
        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }

        await sequelize.transaction(async (transaction) => {
            // 참가자 확인
            const participant = await MeetingParticipant.findOne({
                where: {
                    meeting_id: meetingId,
                    user_id: userId
                },
                transaction
            });

            if (!participant) {
                throw new Error('참가하지 않은 모임입니다.');
            }

            // 생성자는 탈퇴할 수 없음
            if (meeting.created_by === userId) {
                throw new Error('모임 생성자는 탈퇴할 수 없습니다.');
            }

            // 참가자 제거
            await MeetingParticipant.destroy({
                where: {
                    meeting_id: meetingId,
                    user_id: userId
                },
                transaction
            });

            // 관련 스케줄 삭제
            await Schedule.destroy({
                where: {
                    user_id: userId,
                    title: `번개 모임: ${meeting.title}`,
                    time_idx: {
                        [Op.between]: [meeting.time_idx_start, meeting.time_idx_end]
                    }
                },
                transaction
            });

            // 채팅방에서 제거
            const chatRoom = await ChatRooms.findOne({
                chatRoomId: meeting.chatRoomId
            });
            if (chatRoom) {
                const user = await User.findByPk(userId);
                chatRoom.participants = chatRoom.participants.filter(p => p.name !== user.name);
                chatRoom.isOnline.delete(user.name);
                chatRoom.lastReadAt.delete(user.name);
                chatRoom.lastReadLogId.delete(user.name);

                const leaveMessage = {
                    message: `${user.name}님이 퇴장했습니다.`,
                    timestamp: new Date(),
                    type: 'leave'
                };

                chatRoom.messages.push(leaveMessage);

                await chatRoom.save();
            }

            // 현재 인원 수 감소
            await meeting.decrement('cur_num', { by: 1, transaction });
        });
    }

    async deleteMeeting(meetingId, userId) {
        const meeting = await Meeting.findByPk(meetingId);

        if (!meeting) {
            throw new Error('모임을 찾을 수 없습니다.');
        }

        if (meeting.created_by !== userId) {
            throw new Error('모임 생성자만 삭제할 수 있습니다.');
        }

        return await sequelize.transaction(async (transaction) => {
            const participants = await MeetingParticipant.findAll({
                where: { meeting_id: meetingId },
                attributes: ['user_id'],
                transaction
            });

            const participantIds = participants.map(p => p.user_id);

            // 모든 참가자의 스케줄 삭제
            await Schedule.destroy({
                where: {
                    user_id: { [Op.in]: participantIds },
                    title: `번개 모임: ${meeting.title}`,
                    time_idx: {
                        [Op.between]: [meeting.time_idx_start, meeting.time_idx_end]
                    }
                },
                transaction
            });

            await ChatRooms.deleteOne({ chatRoomId: meeting.chatRoomId });

            // 모임 관련 데이터 삭제
            await meeting.destroy({ transaction });
        });
    }
}

module.exports = new MeetingService();