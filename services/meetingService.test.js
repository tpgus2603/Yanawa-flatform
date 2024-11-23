// test/meetingService.test.js
const sequelize = require('../config/sequelize'); // 실제 경로에 맞게 수정
const { Op } = require('sequelize');
const { Meeting, MeetingParticipant, User, Schedule } = require('../models');
const MeetingService = require('../services/meetingService');
const ScheduleService = require('../services/scheduleService');
const ChatRooms = require('../models/ChatRooms'); // MongoDB 모델
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');
const MeetingResponseDTO = require('../dtos/MeetingResponseDTO');
const MeetingDetailResponseDTO = require('../dtos/MeetingDetailResponseDTO');

// ChatRooms 모듈 전체를 모킹하지 않고, 필요한 메서드만 선택적으로 모킹합니다.
beforeAll(async () => {
    // 테스트 스위트가 시작되기 전에 데이터베이스를 동기화합니다.
    await sequelize.sync({ force: true });
});

beforeEach(async () => {
    // 각 테스트가 시작되기 전에 기존 데이터를 삭제합니다.
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

    // 더미 스케줄 생성 (이미 존재하는 스케줄로 스케줄 겹침 테스트에 사용)
    await Schedule.bulkCreate([
        { id: 1, user_id: 1, title: 'Alice Schedule', time_idx: 50, is_fixed: true },
        { id: 2, user_id: 2, title: 'Bob Schedule', time_idx: 60, is_fixed: true },
    ]);

    // ChatRooms 모킹 설정
    jest.clearAllMocks();

    // ChatRooms 인스턴스 메서드 모킹
    jest.spyOn(ChatRooms.prototype, 'save').mockImplementation(() => Promise.resolve());

    // ChatRooms 스태틱 메서드 모킹
    jest.spyOn(ChatRooms, 'findOne').mockImplementation(async () => {
        return {
            participants: [],
            isOnline: new Map(),
            lastReadAt: new Map(),
            lastReadLogId: new Map(),
            save: jest.fn().mockResolvedValue(true),
        };
    });
});

afterAll(async () => {
    await sequelize.close();
});

describe('MeetingService', () => {
    describe('createMeeting', () => {
        test('should create a new meeting successfully', async () => {
            const meetingData = {
                title: 'Team Meeting',
                description: 'Weekly sync-up meeting.',
                time_idx_start: 70,
                time_idx_end: 72,
                location: 'Conference Room A',
                time_idx_deadline: 68,
                type: 'OPEN',
                created_by: 1,
            };

            const result = await MeetingService.createMeeting(meetingData);

            expect(result).toBeDefined();
            expect(result.meeting_id).toBeDefined();
            expect(result.chatRoomId).toBeDefined();

            // 데이터베이스에서 모임 확인
            const meeting = await Meeting.findByPk(result.meeting_id);
            expect(meeting).toBeDefined();
            expect(meeting.title).toBe('Team Meeting');
            expect(meeting.created_by).toBe(1);

            // 모임 참가자 확인
            const participants = await MeetingParticipant.findAll({ where: { meeting_id: result.meeting_id } });
            expect(participants.length).toBe(1);
            expect(participants[0].user_id).toBe(1);

            // 스케줄 생성 확인
            const schedules = await Schedule.findAll({ where: { user_id: 1, title: '번개 모임: Team Meeting' } });
            expect(schedules.length).toBe(3); // time_idx_start부터 time_idx_end까지
            schedules.forEach(schedule => {
                expect(schedule.is_fixed).toBe(false); // 유동 시간대
                expect(schedule.time_idx).toBeGreaterThanOrEqual(70);
                expect(schedule.time_idx).toBeLessThanOrEqual(72);
            });

            // ChatRooms 모킹 확인
            expect(ChatRooms.prototype.save).toHaveBeenCalledTimes(1);
        });

        test('should throw error when user does not exist', async () => {
            const meetingData = {
                title: 'Invalid User Meeting',
                description: 'This should fail.',
                time_idx_start: 70,
                time_idx_end: 72,
                location: 'Conference Room A',
                time_idx_deadline: 68,
                type: 'OPEN',
                created_by: 999, // 존재하지 않는 사용자 ID
            };

            await expect(MeetingService.createMeeting(meetingData)).rejects.toThrow('사용자를 찾을 수 없습니다.');
        });

        test('should throw error when schedule overlaps', async () => {
            // Alice는 이미 time_idx 50에 스케줄이 있음
            const meetingData = {
                title: 'Overlapping Meeting',
                description: 'This should fail due to schedule overlap.',
                time_idx_start: 49,
                time_idx_end: 51, // time_idx 50 포함
                location: 'Conference Room B',
                time_idx_deadline: 48,
                type: 'OPEN',
                created_by: 1,
            };

            await expect(MeetingService.createMeeting(meetingData)).rejects.toThrow(
                'Schedule overlaps with existing schedule at time_idx 50'
            );
        });
    });

    describe('getMeetings', () => {
        test('should retrieve all meetings', async () => {
            // 미팅 생성
            const meetingData1 = {
                title: 'Meeting 1',
                description: 'First meeting.',
                time_idx_start: 70,
                time_idx_end: 72,
                location: 'Conference Room A',
                time_idx_deadline: 68,
                type: 'OPEN',
                created_by: 1,
            };

            const meetingData2 = {
                title: 'Meeting 2',
                description: 'Second meeting.',
                time_idx_start: 80,
                time_idx_end: 82,
                location: 'Conference Room B',
                time_idx_deadline: 78,
                type: 'OPEN',
                created_by: 2,
            };

            await MeetingService.createMeeting(meetingData1);
            await MeetingService.createMeeting(meetingData2);

            const meetings = await MeetingService.getMeetings(1); // Alice의 사용자 ID

            expect(meetings).toBeDefined();
            expect(Array.isArray(meetings)).toBe(true);
            expect(meetings.length).toBe(2);

            meetings.forEach(meeting => {
                expect(meeting).toBeInstanceOf(MeetingResponseDTO);
                expect(['Meeting 1', 'Meeting 2']).toContain(meeting.title);
                expect(['OPEN']).toContain(meeting.type);
                if (meeting.id === 1) {
                    expect(meeting.creatorName).toBe('Alice');
                    expect(meeting.isParticipant).toBe(true);
                } else {
                    expect(meeting.creatorName).toBe('Bob');
                    expect(meeting.isParticipant).toBe(false);
                }
            });
        });
    });

    describe('closeMeeting', () => {
        test('should close an open meeting successfully', async () => {
            const meetingData = {
                title: 'Meeting to Close',
                description: 'This meeting will be closed.',
                time_idx_start: 90,
                time_idx_end: 92,
                location: 'Conference Room C',
                time_idx_deadline: 88,
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            const closedMeeting = await MeetingService.closeMeeting(meeting_id);

            expect(closedMeeting).toBeDefined();
            expect(closedMeeting.type).toBe('CLOSE');

            // 데이터베이스에서 확인
            const meeting = await Meeting.findByPk(meeting_id);
            expect(meeting.type).toBe('CLOSE');
        });

        test('should throw error when closing a non-existing meeting', async () => {
            await expect(MeetingService.closeMeeting(999)).rejects.toThrow('모임을 찾을 수 없습니다.');
        });

        test('should throw error when closing an already closed meeting', async () => {
            const meetingData = {
                title: 'Already Closed Meeting',
                description: 'This meeting is already closed.',
                time_idx_start: 100,
                time_idx_end: 102,
                location: 'Conference Room D',
                time_idx_deadline: 98,
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            await MeetingService.closeMeeting(meeting_id);

            await expect(MeetingService.closeMeeting(meeting_id)).rejects.toThrow('이미 마감된 모임입니다.');
        });
    });

    describe('joinMeeting', () => {
        test('should allow a user to join an open meeting', async () => {
            const meetingData = {
                title: 'Open Meeting',
                description: 'Users can join this meeting.',
                time_idx_start: 110,
                time_idx_end: 112,
                location: 'Conference Room E',
                time_idx_deadline: 108,
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            // Bob이 참가
            await MeetingService.joinMeeting(meeting_id, 2);

            // 참가자 확인
            const participants = await MeetingParticipant.findAll({ where: { meeting_id } });
            expect(participants.length).toBe(2); // Alice와 Bob

            const participantIds = participants.map((p) => p.user_id);
            expect(participantIds).toContain(1);
            expect(participantIds).toContain(2);

            // Bob의 스케줄 생성 확인
            const schedules = await Schedule.findAll({
                where: { user_id: 2, title: `번개 모임: ${meetingData.title}` },
            });
            expect(schedules.length).toBe(3); // time_idx_start부터 time_idx_end까지
            schedules.forEach(schedule => {
                expect(schedule.is_fixed).toBe(true); // 고정 시간대
                expect(schedule.time_idx).toBeGreaterThanOrEqual(110);
                expect(schedule.time_idx).toBeLessThanOrEqual(112);
            });

            // ChatRooms 모킹 확인
            expect(ChatRooms.findOne).toHaveBeenCalledTimes(1);
            const chatRoom = await ChatRooms.findOne();
            expect(chatRoom.save).toHaveBeenCalledTimes(1);
        });

        test('should throw error when joining a closed meeting', async () => {
            const meetingData = {
                title: 'Closed Meeting',
                description: 'This meeting is closed.',
                time_idx_start: 120,
                time_idx_end: 122,
                location: 'Conference Room F',
                time_idx_deadline: 118,
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            await MeetingService.closeMeeting(meeting_id);

            await expect(MeetingService.joinMeeting(meeting_id, 2)).rejects.toThrow('이미 마감된 모임입니다.');
        });

        test('should throw error when user already joined', async () => {
            const meetingData = {
                title: 'Meeting with Bob',
                description: 'Bob will join this meeting.',
                time_idx_start: 130,
                time_idx_end: 132,
                location: 'Conference Room G',
                time_idx_deadline: 128,
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            await MeetingService.joinMeeting(meeting_id, 2);

            await expect(MeetingService.joinMeeting(meeting_id, 2)).rejects.toThrow('이미 참가한 사용자입니다.');
        });

        test('should throw error when schedule overlaps', async () => {
            // Bob은 이미 time_idx 60에 스케줄이 있음
            const meetingData = {
                title: 'Overlapping Schedule Meeting',
                description: 'Bob has a conflicting schedule.',
                time_idx_start: 59,
                time_idx_end: 61, // time_idx 60 포함
                location: 'Conference Room H',
                time_idx_deadline: 58,
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            await expect(MeetingService.joinMeeting(meeting_id, 2)).rejects.toThrow(
                '스케줄이 겹칩니다. 다른 모임에 참가하세요.'
            );
        });
    });

    describe('getMeetingDetail', () => {
        test('should retrieve meeting details', async () => {
            const meetingData = {
                title: 'Detailed Meeting',
                description: 'This meeting has details.',
                time_idx_start: 140,
                time_idx_end: 142,
                location: 'Conference Room I',
                time_idx_deadline: 138,
                type: 'OPEN',
                created_by: 1,
            };

            const { meeting_id } = await MeetingService.createMeeting(meetingData);

            // Bob과 Charlie 참가
            await MeetingService.joinMeeting(meeting_id, 2);
            await MeetingService.joinMeeting(meeting_id, 3);

            const meetingDetail = await MeetingService.getMeetingDetail(meeting_id);

            expect(meetingDetail).toBeDefined();
            expect(meetingDetail).toBeInstanceOf(MeetingDetailResponseDTO);
            expect(meetingDetail.title).toBe('Detailed Meeting');
            expect(meetingDetail.creatorName).toBe('Alice');
            expect(meetingDetail.participants.length).toBe(3); // Alice, Bob, Charlie

            const participantNames = meetingDetail.participants.map((p) => p.name);
            expect(participantNames).toContain('Alice');
            expect(participantNames).toContain('Bob');
            expect(participantNames).toContain('Charlie');
        });

        test('should throw error when meeting does not exist', async () => {
            await expect(MeetingService.getMeetingDetail(999)).rejects.toThrow('모임을 찾을 수 없습니다.');
        });
    });
});
