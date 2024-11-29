// test/meetingService.test.js
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');
const { Meeting, MeetingParticipant, User, Schedule } = require('../models');
const MeetingService = require('../services/meetingService');
const ScheduleService = require('../services/scheduleService');
const ChatRooms = require('../models/chatRooms');
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');
const MeetingResponseDTO = require('../dtos/MeetingResponseDTO');
const MeetingDetailResponseDTO = require('../dtos/MeetingDetailResponseDTO');



beforeAll(async () => {
    // 데이터베이스 초기화 및 동기화
    await sequelize.sync({ force: true });
});

beforeEach(async () => {
    // 외래 키 순서에 따라 데이터 삭제
    await MeetingParticipant.destroy({ where: {}, truncate: true });
    await Meeting.destroy({ where: {}, truncate: true });
    await Schedule.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });

    // 더미 사용자 데이터 삽입
    await User.bulkCreate([
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    ]);

    // ChatRooms Mock 설정
    jest.spyOn(ChatRooms.prototype, 'save').mockResolvedValue(undefined);
    jest.spyOn(ChatRooms, 'findOne').mockResolvedValue({
        participants: [],
        isOnline: new Map(),
        lastReadAt: new Map(),
        lastReadLogId: new Map(),
        save: jest.fn().mockResolvedValue(true),
    });
});

afterEach(() => {
    // Mock 복원 및 초기화
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

afterAll(async () => {
    // 데이터베이스 연결 종료
    await sequelize.close();
});

describe('MeetingService - 전체 미팅 조회 테스트', () => {
    beforeEach(async () => {
        await MeetingParticipant.destroy({ where: {} });
        await Meeting.destroy({ where: {} });
        await Schedule.destroy({ where: {} });
        await User.destroy({ where: {} });

        // 더미 사용자 생성
        await User.bulkCreate([
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' },
            { id: 3, name: 'Charlie', email: 'charlie@example.com' }
        ]);

        // 스케줄 충돌 체크 Mock 설정
        jest.spyOn(ScheduleService, 'checkScheduleOverlapByTime')
            .mockImplementation(async (userId, start, end) => {
                // 36-38 시간대 충돌
                if (start <= 38 && end >= 36) return true;
                // 51 시간대 충돌 (Bob의 개인 일정)
                if (userId === 2 && start <= 51 && end >= 51) return true;
                return false;
            });
    });

    test('모든 미팅 목록 조회 및 스케줄 충돌 확인', async () => {
        // 1. Alice의 스케줄 등록
        await ScheduleService.createSchedules({
            userId: 1,
            title: '기존 일정',
            is_fixed: true,
            events: [
                { time_idx: 36 },
                { time_idx: 37 },
                { time_idx: 38 }
            ]
        });

        // 2. getCurrentTimeIdx Mock 설정
        jest.spyOn(MeetingService, 'getCurrentTimeIdx')
            .mockReturnValue(30);

        const meetingData1 = {
            title: '아침 미팅',
            time_idx_start: 36,
            time_idx_end: 38,
            created_by: 2,
            type: 'OPEN',
            time_idx_deadline: 35,
            location: 'Room A'
        };

        const meetingData2 = {
            title: '점심 미팅',
            time_idx_start: 44,
            time_idx_end: 46,
            created_by: 3,
            type: 'OPEN',
            time_idx_deadline: 43,
            location: 'Room B'
        };

        await MeetingService.createMeeting(meetingData1);
        await MeetingService.createMeeting(meetingData2);

        const {content: meetings} = await MeetingService.getMeetings(1, {limit: 20, offset: 0});

        expect(meetings.length).toBe(2);

        const morningMeeting = meetings.find(m => m.title === '아침 미팅');
        expect(morningMeeting.isScheduleConflict).toBe(true);
        expect(morningMeeting.creatorName).toBe('Bob');
        expect(morningMeeting.isParticipant).toBe(false);

        const lunchMeeting = meetings.find(m => m.title === '점심 미팅');
        expect(lunchMeeting.isScheduleConflict).toBe(false);
        expect(lunchMeeting.creatorName).toBe('Charlie');
        expect(lunchMeeting.isParticipant).toBe(false);
    });

    test('미팅 상세 정보 조회 및 충돌 확인', async () => {
        jest.spyOn(MeetingService, 'getCurrentTimeIdx')
            .mockReturnValue(35);

        jest.spyOn(ScheduleService, 'checkScheduleOverlapByTime')
            .mockImplementation(async (userId, start, end) => {
                return start === 40 && end === 42 && userId === 1;
            });

        const meeting = await MeetingService.createMeeting({
            title: '팀 미팅',
            time_idx_start: 40,
            time_idx_end: 42,
            created_by: 2,
            type: 'OPEN',
            time_idx_deadline: 39,
            location: 'Room A'
        });

        await MeetingService.joinMeeting(meeting.meeting_id, 3);

        const meetingDetail = await MeetingService.getMeetingDetail(meeting.meeting_id, 1);

        expect(meetingDetail.title).toBe('팀 미팅');
        expect(meetingDetail.isScheduleConflict).toBe(true);
        expect(meetingDetail.creatorName).toBe('Bob');
    });

    test('여러 사용자 관점에서의 미팅 조회', async () => {
        const meeting = await MeetingService.createMeeting({
            title: '공통 미팅',
            time_idx_start: 50,
            time_idx_end: 52,
            created_by: 1,
            type: 'OPEN',
            location: 'Room A',
            time_idx_deadline: 49
        });

        await ScheduleService.createSchedules({
            userId: 2,
            title: '개인 일정',
            is_fixed: true,
            events: [{ time_idx: 51 }]
        });

        const {content: aliceMeetings } = await MeetingService.getMeetings(1, {limit: 20, offset: 0});
        const {content: bobMeetings } = await MeetingService.getMeetings(2, {limit: 20, offset: 0});
        const {content: charlieMeetings } = await MeetingService.getMeetings(3, {limit: 20, offset: 0});

        expect(aliceMeetings[0].isScheduleConflict).toBe(false);
        expect(bobMeetings[0].isScheduleConflict).toBe(true);
        expect(charlieMeetings[0].isScheduleConflict).toBe(false);

        expect(aliceMeetings[0].isParticipant).toBe(true);
        expect(bobMeetings[0].isParticipant).toBe(false);
        expect(charlieMeetings[0].isParticipant).toBe(false);
    });
});

describe('MeetingService - Integration: createMeeting, joinMeeting, getMeetings', () => {
    beforeEach(async () => {
        await MeetingParticipant.destroy({ where: {} });
        await Meeting.destroy({ where: {} });
        await Schedule.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create dummy users
        await User.bulkCreate([
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' },
            { id: 3, name: 'Charlie', email: 'charlie@example.com' },
        ]);
    });

    test('should create a meeting, allow multiple users to join, and retrieve them correctly', async () => {
        // Step 1: Create a meeting
        const meetingData = {
            title: 'Integration Test Meeting',
            description: 'Test meeting for integration.',
            time_idx_start: 10,
            time_idx_end: 20,
            location: 'Conference Room A',
            time_idx_deadline: 8,
            type: 'OPEN',
            created_by: 1,
        };

        const createdMeeting = await MeetingService.createMeeting(meetingData);

        expect(createdMeeting).toBeDefined();
        expect(createdMeeting.meeting_id).toBeDefined();
        expect(createdMeeting.chatRoomId).toBeDefined();

        // Step 2: Bob and Charlie join the meeting
        jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(5); // Ensure deadline is not passed
        await MeetingService.joinMeeting(createdMeeting.meeting_id, 2); // Bob joins
        await MeetingService.joinMeeting(createdMeeting.meeting_id, 3); // Charlie joins

        // Step 3: Retrieve meetings for Alice (creator)
        const {content: aliceMeetings } = await MeetingService.getMeetings(1, {limit: 20, offset: 0});
        expect(aliceMeetings).toBeDefined();
        expect(aliceMeetings.length).toBe(1);

        const aliceMeeting = aliceMeetings[0];
        expect(aliceMeeting.title).toBe('Integration Test Meeting');
        expect(aliceMeeting.creatorName).toBe('Alice');
        expect(aliceMeeting.isParticipant).toBe(true);

        // Step 4: Retrieve meetings for Bob (participant)
        const {content: bobMeetings } = await MeetingService.getMeetings(2, {limit: 20, offset: 0});
        expect(bobMeetings).toBeDefined();
        expect(bobMeetings.length).toBe(1);

        const bobMeeting = bobMeetings[0];
        expect(bobMeeting.title).toBe('Integration Test Meeting');
        expect(bobMeeting.creatorName).toBe('Alice');
        expect(bobMeeting.isParticipant).toBe(true);

        // Step 5: Retrieve meetings for Charlie (participant)
        const {content: charlieMeetings } = await MeetingService.getMeetings(3, {limit: 20, offset: 0});
        expect(charlieMeetings).toBeDefined();
        expect(charlieMeetings.length).toBe(1);

        const charlieMeeting = charlieMeetings[0];
        expect(charlieMeeting.title).toBe('Integration Test Meeting');
        expect(charlieMeeting.creatorName).toBe('Alice');
        expect(charlieMeeting.isParticipant).toBe(true);
    });

    test('should not allow joining a meeting after the deadline', async () => {
        const meetingData = {
            title: 'Deadline Test Meeting',
            description: 'Meeting to test deadlines.',
            time_idx_start: 30,
            time_idx_end: 40,
            location: 'Conference Room B',
            time_idx_deadline: 25,
            type: 'OPEN',
            created_by: 1, // Alice creates the meeting
        };

        const createdMeeting = await MeetingService.createMeeting(meetingData);

        jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(26); // Simulate time after the deadline

        await expect(
            MeetingService.joinMeeting(createdMeeting.meeting_id, 2)
        ).rejects.toThrow('참가 신청이 마감되었습니다.');
    });

    test('should prevent duplicate joining of a meeting', async () => {
        const meetingData = {
            title: 'Duplicate Join Test Meeting',
            description: 'Meeting to test duplicate join handling.',
            time_idx_start: 50,
            time_idx_end: 60,
            location: 'Conference Room C',
            time_idx_deadline: 48,
            type: 'OPEN',
            created_by: 1, // Alice creates the meeting
        };

        const createdMeeting = await MeetingService.createMeeting(meetingData);

        jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(45); // Ensure deadline is not passed
        await MeetingService.joinMeeting(createdMeeting.meeting_id, 2); // Bob joins

        // Attempt duplicate join
        await expect(
            MeetingService.joinMeeting(createdMeeting.meeting_id, 2)
        ).rejects.toThrow('이미 참가한 사용자입니다.');
    });

    test('should prevent joining when schedule conflicts', async () => {
        const meetingData = {
            title: 'Conflict Test Meeting',
            description: 'Meeting to test schedule conflict.',
            time_idx_start: 70,
            time_idx_end: 80,
            location: 'Conference Room D',
            time_idx_deadline: 68,
            type: 'OPEN',
            created_by: 1, // Alice creates the meeting
        };

        const createdMeeting = await MeetingService.createMeeting(meetingData);

        // Step 1: Virtually set current time before the deadline
        jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(65); // 현재 시간이 데드라인보다 작음

        // Step 2: Simulate schedule conflict
        jest.spyOn(ScheduleService, 'checkScheduleOverlapByTime').mockResolvedValue(true); // 스케줄 충돌 발생

        // Step 3: Expect schedule conflict error
        await expect(
            MeetingService.joinMeeting(createdMeeting.meeting_id, 2)
        ).rejects.toThrow('스케줄이 겹칩니다. 다른 모임에 참가하세요.');
    });

});

describe('MeetingService2', () => {
    beforeEach(async () => {
        // 데이터베이스 초기화
        await MeetingParticipant.destroy({ where: {} });
        await Meeting.destroy({ where: {} });
        await Schedule.destroy({ where: {} });
        await User.destroy({ where: {} });

        // 더미 사용자 생성
        await User.bulkCreate([
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' },
            { id: 3, name: 'Charlie', email: 'charlie@example.com' },
        ]);
    });

    test('사용자가 여러 모임에 참여하고 이를 정확히 조회할 수 있어야 한다', async () => {
        // 1단계: 겹치지 않는 시간대의 모임 생성
        const meetingData1 = {
            title: 'Morning Meeting',
            description: 'Morning planning meeting.',
            time_idx_start: 10,
            time_idx_end: 20,
            location: 'Room A',
            time_idx_deadline: 8,
            type: 'OPEN',
            created_by: 1, // Alice가 모임 생성
        };

        const meetingData2 = {
            title: 'Lunch Meeting',
            description: 'Lunch and discussion.',
            time_idx_start: 30,
            time_idx_end: 40,
            location: 'Room B',
            time_idx_deadline: 28,
            type: 'OPEN',
            created_by: 2, // Bob이 모임 생성
        };

        const meeting1 = await MeetingService.createMeeting(meetingData1);
        const meeting2 = await MeetingService.createMeeting(meetingData2);

        // 모임 생성 확인
        expect(meeting1).toBeDefined();
        expect(meeting2).toBeDefined();

        // 2단계: Charlie가 두 모임에 참여
        jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(5); // 마감 시간을 초과하지 않도록 설정
        await MeetingService.joinMeeting(meeting1.meeting_id, 3); // Charlie가 Morning Meeting 참여
        await MeetingService.joinMeeting(meeting2.meeting_id, 3); // Charlie가 Lunch Meeting 참여

        // 3단계: Charlie의 참여 모임 조회
        const {content: charlieMeetings } = await MeetingService.getMeetings(3, {limit: 20, offset: 0}); // Charlie의 사용자 ID
        expect(charlieMeetings).toBeDefined();
        expect(Array.isArray(charlieMeetings)).toBe(true);
        expect(charlieMeetings.length).toBe(2); // Charlie는 2개의 모임에 참여

        // 각 모임의 세부 정보 확인
        const morningMeeting = charlieMeetings.find(meeting => meeting.title === 'Morning Meeting');
        const lunchMeeting = charlieMeetings.find(meeting => meeting.title === 'Lunch Meeting');

        expect(morningMeeting).toBeDefined();
        expect(morningMeeting.creatorName).toBe('Alice');
        expect(morningMeeting.isParticipant).toBe(true);

        expect(lunchMeeting).toBeDefined();
        expect(lunchMeeting.creatorName).toBe('Bob');
        expect(lunchMeeting.isParticipant).toBe(true);

        // 추가 검증: 각 모임에 대한 Charlie의 스케줄이 올바르게 생성되었는지 확인
        const charlieSchedules = await Schedule.findAll({ where: { user_id: 3 } });
        expect(charlieSchedules.length).toBe(2 * (20 - 10 + 1)); // 두 모임, 각 모임마다 11개의 스케줄 (10~20, 30~40)

        // 중복 스케줄이 없는지 확인
        const timeIndicesMorning = charlieSchedules
            .filter(schedule => schedule.title === `번개 모임: ${meetingData1.title}`)
            .map(schedule => schedule.time_idx);
        const timeIndicesLunch = charlieSchedules
            .filter(schedule => schedule.title === `번개 모임: ${meetingData2.title}`)
            .map(schedule => schedule.time_idx);

        // Morning Meeting의 시간대 확인
        for (let i = 10; i <= 20; i++) {
            expect(timeIndicesMorning).toContain(i);
        }

        // Lunch Meeting의 시간대 확인
        for (let i = 30; i <= 40; i++) {
            expect(timeIndicesLunch).toContain(i);
        }
    });

    test('각 사용자의 모임을 정확히 조회해야 한다', async () => {
        // 1단계: 겹치지 않는 시간대의 모임 생성
        const meetingData1 = {
            title: 'Morning Meeting',
            time_idx_start: 10,
            time_idx_end: 20,
            location: 'Room A',
            time_idx_deadline: 8,
            type: 'OPEN',
            created_by: 1
        };

        const meetingData2 = {
            title: 'Lunch Meeting',
            time_idx_start: 30,
            time_idx_end: 40,
            location: 'Room B',
            time_idx_deadline: 28,
            type: 'OPEN',
            created_by: 2
        };

        const meeting1 = await MeetingService.createMeeting(meetingData1);
        const meeting2 = await MeetingService.createMeeting(meetingData2);

        // 2단계: Charlie가 두 모임에 참여
        jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(5);
        await MeetingService.joinMeeting(meeting1.meeting_id, 3);
        await MeetingService.joinMeeting(meeting2.meeting_id, 3);

        // 3단계: 각 사용자의 모임 조회
        const pagination = {limit: 20, offset:0 };
        const {content: aliceMeetings} = await MeetingService.getMeetings(1, pagination);
        const {content: bobMeetings} = await MeetingService.getMeetings(2, pagination);
        const {content: charlieMeetings} = await MeetingService.getMeetings(3, pagination);

        // 모든 미팅이 조회되어야 함
        expect(aliceMeetings.length).toBe(2);
        expect(bobMeetings.length).toBe(2);
        expect(charlieMeetings.length).toBe(2);

        // 참가 여부 확인
        const aliceMorningMeeting = aliceMeetings.find(m => m.title === 'Morning Meeting');
        expect(aliceMorningMeeting.isParticipant).toBe(true);

        const bobLunchMeeting = bobMeetings.find(m => m.title === 'Lunch Meeting');
        expect(bobLunchMeeting.isParticipant).toBe(true);

        // Charlie는 두 미팅 모두 참가
        expect(charlieMeetings.every(m => m.isParticipant)).toBe(true);
    });
});

