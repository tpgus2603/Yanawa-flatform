// test/meetingService.test.js

const { sequelize, User, Friend, Schedule, Meeting, MeetingParticipant, ChatRoom } = require('../models'); // models/index.js를 통해 임포트
const MeetingService = require('../services/meetingService');
const ScheduleService = require('../services/scheduleService'); // ScheduleService 임포트
const chatController = require('../controllers/chatController');

// Jest를 사용하여 chatController 모킹
jest.mock('../controllers/chatController', () => ({
    createChatRoomInternal: jest.fn()
}));

describe('MeetingService', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });

        // 더미 사용자 생성
        await User.bulkCreate([
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' },
        ]);

        // 더미 친구 관계 생성
        await Friend.create({
            id: 1,
            requester_id: 1,
            receiver_id: 2,
            status: 'ACCEPTED',
        });

        // 더미 스케줄 생성
        await Schedule.bulkCreate([
            {
                id: 1,
                user_id: 1,
                title: "Alice's Fixed Schedule",
                start_time: new Date('2024-05-01T09:00:00Z'),
                end_time: new Date('2024-05-01T10:00:00Z'),
                is_fixed: true,
                expiry_date: null,
            },
            {
                id: 2,
                user_id: 1,
                title: "Alice's Flexible Schedule",
                start_time: new Date('2024-05-02T11:00:00Z'),
                end_time: new Date('2024-05-02T12:00:00Z'),
                is_fixed: false,
                expiry_date: new Date('2024-05-08T00:00:00Z'), // 다음 월요일
            },
        ]);

        // 기본적인 채팅방 생성 모킹 설정 (성공)
        chatController.createChatRoomInternal.mockResolvedValue({
            success: true,
            chatRoomId: 'chatroom-1234'
        });
    });

    afterAll(async () => {
        // 데이터베이스 연결 종료
        await sequelize.close();
    });

    beforeEach(() => {
        // 각 테스트 전에 mock 호출 이력 초기화
        jest.clearAllMocks();
    });

    describe('createMeeting', () => {
        test('번개 모임을 성공적으로 생성해야 한다', async () => {
            const meetingData = {
                title: 'Tech Talk',
                description: 'A discussion on the latest tech trends.',
                start_time: '2024-05-10T10:00:00Z',
                end_time: '2024-05-10T12:00:00Z',
                location: 'Online',
                deadline: '2024-05-09T23:59:59Z',
                type: 'OPEN',
                created_by: 1,
            };

            const result = await MeetingService.createMeeting(meetingData);
            expect(result).toHaveProperty('meeting_id');
            expect(result).toHaveProperty('chatRoomId');
            expect(result.chatRoomId).toBe('chatroom-1234');

            // 모임이 DB에 생성되었는지 확인
            const meeting = await Meeting.findByPk(result.meeting_id);
            expect(meeting).toBeDefined();
            expect(meeting.title).toBe('Tech Talk');

            // 참가자가 추가되었는지 확인
            const participant = await MeetingParticipant.findOne({
                where: { meeting_id: result.meeting_id, user_id: 1 }
            });
            expect(participant).toBeDefined();

            // 스케줄이 추가되었는지 확인
            const schedule = await Schedule.findOne({
                where: { user_id: 1, title: '번개 모임: Tech Talk' }
            });
            expect(schedule).toBeDefined();
            expect(schedule.start_time.toISOString()).toBe('2024-05-10T10:00:00.000Z');
            expect(schedule.end_time.toISOString()).toBe('2024-05-10T12:00:00.000Z');
            expect(schedule.is_fixed).toBe(true);
            expect(schedule.expiry_date).toBeNull();

            // chatController.createChatRoomInternal이 호출되었는지 확인
            expect(chatController.createChatRoomInternal).toHaveBeenCalledTimes(1);
            expect(chatController.createChatRoomInternal).toHaveBeenCalledWith({
                participants: ['Alice']
            });
        });

        test('사용자의 스케줄이 겹치는 경우 모임 생성을 실패해야 한다', async () => {
            // Alice의 기존 스케줄 생성 (이미 beforeAll에서 생성됨)
            const overlappingMeetingData = {
                title: 'Overlap Meeting',
                description: 'This meeting overlaps with Alice\'s fixed schedule.',
                start_time: '2024-05-01T09:30:00Z', // Alice's Fixed Schedule과 겹침
                end_time: '2024-05-01T11:00:00Z',
                location: 'Office',
                deadline: '2024-04-30T23:59:59Z',
                type: 'OPEN',
                created_by: 1,
            };

            await expect(MeetingService.createMeeting(overlappingMeetingData))
                .rejects
                .toThrow('스케줄이 겹칩니다. 다른 시간을 선택해주세요.');
        });

        test('모임 생성 시 스케줄의 유동 스케줄이 만료되면 스케줄 충돌이 발생하지 않아야 한다', async () => {
            const meetingData = {
                title: 'Morning Meeting',
                description: 'Meeting after flexible schedule expiry.',
                start_time: '2024-05-09T09:00:00Z', // Flexible Schedule의 expiry_date가 지난 시점
                end_time: '2024-05-09T10:00:00Z',
                location: 'Conference Room',
                deadline: '2024-05-08T23:59:59Z',
                type: 'OPEN',
                created_by: 1,
            };

            const result = await MeetingService.createMeeting(meetingData);
            expect(result).toHaveProperty('meeting_id');
            expect(result).toHaveProperty('chatRoomId');
            expect(result.chatRoomId).toBe('chatroom-1234');

            // 스케줄이 추가되었는지 확인
            const schedule = await Schedule.findOne({
                where: { user_id: 1, title: '번개 모임: Morning Meeting' }
            });
            expect(schedule).toBeDefined();
            expect(schedule.start_time.toISOString()).toBe('2024-05-09T09:00:00.000Z');
            expect(schedule.end_time.toISOString()).toBe('2024-05-09T10:00:00.000Z');
            expect(schedule.is_fixed).toBe(true);
            expect(schedule.expiry_date).toBeNull();
        });

        test('모임 생성 시 채팅방 생성 실패하면 에러를 던져야 한다', async () => {
            // chatController.createChatRoomInternal을 실패하도록 모킹
            chatController.createChatRoomInternal.mockResolvedValueOnce({
                success: false
            });

            const meetingData = {
                title: 'Failed ChatRoom Meeting',
                description: 'This meeting will fail to create chat room.',
                start_time: '2024-05-11T10:00:00Z',
                end_time: '2024-05-11T12:00:00Z',
                location: 'Online',
                deadline: '2024-05-10T23:59:59Z',
                type: 'OPEN',
                created_by: 1,
            };

            await expect(MeetingService.createMeeting(meetingData))
                .rejects
                .toThrow('채팅방 생성 실패');
        });

        test('모임 생성 시 유효하지 않은 데이터는 검증 에러를 던져야 한다', async () => {
            const invalidMeetingData = {
                title: '', // 빈 제목
                start_time: 'invalid-date',
                end_time: '2024-05-10T09:00:00Z', // start_time보다 이전
                type: 'INVALID_TYPE',
                created_by: -1, // 음수 ID
            };

            await expect(MeetingService.createMeeting(invalidMeetingData))
                .rejects
                .toThrow('Validation error');
        });
    });

    describe('joinMeeting', () => {
        test('번개 모임에 성공적으로 참가해야 한다', async () => {
            // Alice가 모임 생성
            const meetingData = {
                title: 'Networking Event',
                description: 'An event to network with professionals.',
                start_time: '2024-06-15T10:00:00Z',
                end_time: '2024-06-15T12:00:00Z',
                location: 'Conference Hall',
                deadline: '2024-06-14T23:59:59Z',
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            // Bob가 모임에 참가
            await MeetingService.joinMeeting(meeting_id, 2);

            // 참가자가 추가되었는지 확인
            const participant = await MeetingParticipant.findOne({
                where: { meeting_id: meeting_id, user_id: 2 }
            });
            expect(participant).toBeDefined();

            // 스케줄이 추가되었는지 확인
            const schedule = await Schedule.findOne({
                where: { user_id: 2, title: '번개 모임: Networking Event' }
            });
            expect(schedule).toBeDefined();
            expect(schedule.start_time.toISOString()).toBe('2024-06-15T10:00:00.000Z');
            expect(schedule.end_time.toISOString()).toBe('2024-06-15T12:00:00.000Z');
            expect(schedule.is_fixed).toBe(true);
            expect(schedule.expiry_date).toBeNull();

            // chatController.createChatRoomInternal이 호출되지 않았는지 확인 (이미 모임 생성 시 호출됨)
            expect(chatController.createChatRoomInternal).toHaveBeenCalledTimes(1);
        });

        test('모임 참가 시 스케줄이 겹치는 경우 참가를 실패해야 한다', async () => {
            // Alice가 모임 생성
            const meetingData1 = {
                title: 'Morning Yoga',
                description: 'Start your day with yoga.',
                start_time: '2024-07-01T06:00:00Z',
                end_time: '2024-07-01T07:00:00Z',
                location: 'Gym',
                deadline: '2024-06-30T23:59:59Z',
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id: meetingId1 } = await MeetingService.createMeeting(meetingData1);

            // Bob의 기존 스케줄 생성
            await ScheduleService.createSchedule({
                userId: 2,
                title: 'Work',
                start_time: new Date('2024-07-01T06:30:00Z'),
                end_time: new Date('2024-07-01T08:30:00Z'),
                is_fixed: true,
            }, null); // 트랜잭션 없이 생성

            // Bob가 모임에 참가 시도
            await expect(MeetingService.joinMeeting(meetingId1, 2))
                .rejects
                .toThrow('스케줄이 겹칩니다. 다른 모임에 참가하세요.');
        });

        test('모임 참가 시 이미 참가한 사용자는 다시 참가할 수 없어야 한다', async () => {
            // Alice가 모임 생성
            const meetingData = {
                title: 'Evening Run',
                description: 'Join us for an evening run.',
                start_time: '2024-08-20T18:00:00Z',
                end_time: '2024-08-20T19:00:00Z',
                location: 'Park',
                deadline: '2024-08-19T23:59:59Z',
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            // Bob가 모임에 참가
            await MeetingService.joinMeeting(meeting_id, 2);

            // Bob가 다시 모임에 참가하려 시도
            await expect(MeetingService.joinMeeting(meeting_id, 2))
                .rejects
                .toThrow('이미 참가한 사용자입니다.');
        });

        test('모임 마감된 경우 참가를 실패해야 한다', async () => {
            // Alice가 모임 생성 (이미 마감됨)
            const meetingData = {
                title: 'Afternoon Workshop',
                description: 'A workshop on web development.',
                start_time: '2024-09-10T14:00:00Z',
                end_time: '2024-09-10T16:00:00Z',
                location: 'Office',
                deadline: '2024-09-09T23:59:59Z',
                type: 'CLOSE',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            // Bob가 모임에 참가 시도
            await expect(MeetingService.joinMeeting(meeting_id, 2))
                .rejects
                .toThrow('이미 마감된 모임입니다.');
        });
    });
});
