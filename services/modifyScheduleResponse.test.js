// test/scheduleService.test.js
const sequelize = require('../config/sequelize');
const { Schedule, User, Meeting, MeetingParticipant, FcmToken } = require('../models');
const ScheduleService = require('../services/scheduleService');
const MeetingService = require('../services/meetingService');
const ChatRooms = require('../schemas/chatRooms');

describe('Schedule Service and Meeting Integration Tests', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await MeetingParticipant.destroy({ where: {} });
        await Meeting.destroy({ where: {} });
        await Schedule.destroy({ where: {} });
        await User.destroy({ where: {} });
        await FcmToken.destroy({ where: {} });

        // 더미 사용자 생성
        await User.bulkCreate([
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' },
            { id: 3, name: 'Charlie', email: 'charlie@example.com' }
        ]);

        // ChatRooms Mock 설정
        jest.spyOn(ChatRooms.prototype, 'save').mockResolvedValue(undefined);
        jest.spyOn(ChatRooms, 'findOne').mockResolvedValue({
            participants: [],
            isOnline: new Map(),
            lastReadAt: new Map(),
            lastReadLogId: new Map(),
            save: jest.fn().mockResolvedValue(true)
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('Schedule Service Tests', () => {
        test('should create schedule with time_indices', async () => {
            const scheduleData = {
                userId: 1,
                title: 'Test Schedule',
                is_fixed: true,
                time_indices: [36, 37, 38]
            };

            const schedule = await ScheduleService.createSchedules(scheduleData);

            expect(schedule).toBeDefined();
            expect(schedule.title).toBe('Test Schedule');
            expect(schedule.time_indices).toEqual([36, 37, 38]);

            const dbSchedules = await Schedule.findAll({
                where: { user_id: 1, title: 'Test Schedule' }
            });
            expect(dbSchedules.length).toBe(3);
        });

        test('should update schedule with new time_indices', async () => {
            await ScheduleService.createSchedules({
                userId: 1,
                title: 'Original Schedule',
                is_fixed: true,
                time_indices: [36, 37, 38]
            });

            const updateData = {
                originalTitle: 'Original Schedule',
                title: 'Updated Schedule',
                is_fixed: true,
                time_indices: [36, 37, 38, 39]
            };

            const updatedSchedule = await ScheduleService.updateSchedules(1, updateData);

            expect(updatedSchedule.title).toBe('Updated Schedule');
            expect(updatedSchedule.time_indices).toEqual([36, 37, 38, 39]);
        });

        test('should delete schedule by title', async () => {
            await ScheduleService.createSchedules({
                userId: 1,
                title: 'Schedule to Delete',
                is_fixed: true,
                time_indices: [40, 41, 42]
            });

            const result = await ScheduleService.deleteSchedules(1, 'Schedule to Delete');
            expect(result.deletedCount).toBe(3);

            const remainingSchedules = await Schedule.findAll({
                where: { user_id: 1, title: 'Schedule to Delete' }
            });
            expect(remainingSchedules.length).toBe(0);
        });
    });

    describe('Meeting Integration Tests', () => {
        beforeEach(() => {
            jest.spyOn(User, 'findOne').mockResolvedValue({
                id: 1,
                name: 'Alice',
                email: 'alice@example.com',
                fcmTokenList: []
            });
        });

        test('should create meeting with correct schedules', async () => {
            const meetingData = {
                title: 'Test Meeting',
                time_idx_start: 50,
                time_idx_end: 52,
                created_by: 1,
                type: 'OPEN',
                max_num: 5
            };

            const meeting = await MeetingService.createMeeting(meetingData);

            const creatorSchedules = await Schedule.findAll({
                where: {
                    user_id: 1,
                    title: `번개 모임: ${meetingData.title}`
                }
            });

            expect(creatorSchedules.length).toBe(3);
            expect(creatorSchedules.map(s => s.time_idx).sort()).toEqual([50, 51, 52]);
        });

        test('should create correct schedules when joining meeting', async () => {
            const meetingData = {
                title: 'Join Test Meeting',
                time_idx_start: 60,
                time_idx_end: 62,
                created_by: 1,
                type: 'OPEN',
                max_num: 5,
                time_idx_deadline: 59 
            };

            const meeting = await MeetingService.createMeeting(meetingData);
            jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(58);

            await MeetingService.joinMeeting(meeting.meeting_id, 2);

            const participantSchedules = await Schedule.findAll({
                where: {
                    user_id: 2,
                    title: `번개 모임: ${meetingData.title}`
                }
            });

            expect(participantSchedules.length).toBe(3);
            expect(participantSchedules.map(s => s.time_idx).sort()).toEqual([60, 61, 62]);
        });

        test('should handle schedule conflicts correctly', async () => {
            await ScheduleService.createSchedules({
                userId: 2,
                title: 'Existing Schedule',
                is_fixed: true,
                time_indices: [70, 71]
            });

            const meetingData = {
                title: 'Conflict Test Meeting',
                time_idx_start: 70,
                time_idx_end: 72,
                created_by: 1,
                type: 'OPEN',
                max_num: 5,
                time_idx_deadline: 69 
            };

            const meeting = await MeetingService.createMeeting(meetingData);

            await expect(
                MeetingService.joinMeeting(meeting.meeting_id, 2)
            ).rejects.toThrow('스케줄이 겹칩니다');
        });
    });
});