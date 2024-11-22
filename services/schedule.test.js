// test/schedule.test.js
const sequelize = require('../config/sequelize');
const {User, Friend, Schedule,} = require('../models'); 
const scheduleService = require('../services/scheduleService'); // 경로 수정

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

    // 더미 스케줄 생성 (day_of_week과 TIME 형식 사용)
    await Schedule.create({
        id: 1,
        user_id: 1,
        title: 'Alice\'s Fixed Schedule',
        day_of_week: 'Monday',
        start_time: '09:00:00', // 'HH:MM:SS' 형식
        end_time: '10:00:00',
        is_fixed: true,
    });

    await Schedule.create({
        id: 2,
        user_id: 1,
        title: 'Alice\'s Flexible Schedule',
        day_of_week: 'Tuesday',
        start_time: '11:00:00',
        end_time: '12:00:00',
        is_fixed: false,
    });
});

afterAll(async () => {
    // 데이터베이스 연결 종료
    await sequelize.close();
});

describe('Schedule Service', () => {
    describe('createSchedules', () => {
        test('should create new fixed schedules successfully', async () => {
            const scheduleData = {
                userId: 2,
                title: 'Bob\'s Fixed Schedule',
                is_fixed: true,
                events: [
                    {
                        day_of_week: 'Wednesday',
                        start_time: '14:00:00',
                        end_time: '15:00:00',
                    },
                ],
            };

            const schedules = await scheduleService.createSchedules(scheduleData);

            expect(schedules).toBeDefined();
            expect(Array.isArray(schedules)).toBe(true);
            expect(schedules.length).toBe(1);

            const schedule = schedules[0];
            expect(schedule.user_id).toBe(2);
            expect(schedule.title).toBe('Bob\'s Fixed Schedule');
            expect(schedule.is_fixed).toBe(true);
            expect(schedule.day_of_week).toBe('Wednesday');
            expect(schedule.start_time).toBe('14:00');
            expect(schedule.end_time).toBe('15:00');
        });

        test('should create new flexible schedules successfully', async () => {
            const scheduleData = {
                userId: 2,
                title: 'Bob\'s Flexible Schedule',
                is_fixed: false,
                events: [
                    {
                        day_of_week: 'Thursday',
                        start_time: '16:00:00',
                        end_time: '17:00:00',
                    },
                ],
            };

            const schedules = await scheduleService.createSchedules(scheduleData);

            expect(schedules).toBeDefined();
            expect(Array.isArray(schedules)).toBe(true);
            expect(schedules.length).toBe(1);

            const schedule = schedules[0];
            expect(schedule.user_id).toBe(2);
            expect(schedule.title).toBe('Bob\'s Flexible Schedule');
            expect(schedule.is_fixed).toBe(false);
            expect(schedule.day_of_week).toBe('Thursday');
            expect(schedule.start_time).toBe('16:00');
            expect(schedule.end_time).toBe('17:00');
        });

        test('should throw error when schedule times overlap with existing schedule', async () => {
            const scheduleData = {
                userId: 1,
                title: 'Alice\'s Overlapping Schedule',
                is_fixed: false,
                events: [
                    {
                        day_of_week: 'Monday', // 기존 스케줄과 동일한 요일
                        start_time: '09:30:00', // 기존 스케줄과 겹치는 시간
                        end_time: '10:30:00',
                    },
                ],
            };

            await expect(scheduleService.createSchedules(scheduleData))
                .rejects
                .toThrow('Schedule overlaps with existing schedule on Monday');
        });

        test('should throw error when start_time is after end_time', async () => {
            const scheduleData = {
                userId: 1,
                title: 'Invalid Schedule',
                is_fixed: false,
                events: [
                    {
                        day_of_week: 'Friday',
                        start_time: '18:00:00',
                        end_time: '17:00:00', // start_time이 더 늦음
                    },
                ],
            };

            await expect(scheduleService.createSchedules(scheduleData))
                .rejects
                .toThrow('Start time must be before end time');
        });
    });

    describe('updateSchedule', () => {
        test('should update an existing schedule successfully', async () => {
            const updateData = {
                title: 'Alice\'s Updated Flexible Schedule',
                start_time: '11:30:00',
                end_time: '12:30:00',
            };

            const updatedSchedule = await scheduleService.updateSchedule(2, 1, updateData);

            expect(updatedSchedule).toBeDefined();
            expect(updatedSchedule.title).toBe('Alice\'s Updated Flexible Schedule');
            expect(updatedSchedule.start_time).toBe('11:30');
            expect(updatedSchedule.end_time).toBe('12:30');
        });

        test('should throw error when updating a non-existing schedule', async () => {
            const updateData = {
                title: 'Non-existing Schedule',
                start_time: '10:00:00',
                end_time: '11:00:00',
            };

            await expect(scheduleService.updateSchedule(999, 1, updateData))
                .rejects
                .toThrow('Schedule not found');
        });

        test('should throw error when updated schedule overlaps with existing schedule', async () => {
            const updateData = {
                title: 'Alice\'s Overlapping Update',
                start_time: '09:30:00', // 기존 스케줄과 겹침
                end_time: '10:30:00',
            };

            await expect(scheduleService.updateSchedule(2, 1, updateData))
                .rejects
                .toThrow('Schedule overlaps with existing schedule');
        });
    });

    describe('deleteSchedule', () => {
        test('should delete an existing schedule successfully', async () => {
            const result = await scheduleService.deleteSchedule(2, 1);

            expect(result).toEqual({ message: 'Schedule successfully deleted' });

            // 삭제된 스케줄이 실제로 삭제되었는지 확인
            const schedule = await Schedule.findByPk(2);
            expect(schedule).toBeNull();
        });

        test('should throw error when deleting a non-existing schedule', async () => {
            await expect(scheduleService.deleteSchedule(999, 1))
                .rejects
                .toThrow('Schedule not found');
        });
    });

    describe('getAllSchedules', () => {
        test('should retrieve all valid schedules for a user', async () => {
            // 사용자 Alice의 모든 스케줄 조회 (user_id: 1)
            const schedules = await scheduleService.getAllSchedules(1);

            expect(schedules).toBeDefined();
            expect(Array.isArray(schedules)).toBe(true);
            expect(schedules.length).toBe(1); // id=1 스케줄은 is_fixed=true
            expect(schedules[0].title).toBe('Alice\'s Fixed Schedule');
            expect(schedules[0].day_of_week).toBe('Monday');
        });
    });

    describe('getScheduleById', () => {
        test('should retrieve a specific schedule by ID', async () => {
            const schedule = await scheduleService.getScheduleById(1, 1);

            expect(schedule).toBeDefined();
            expect(schedule.title).toBe('Alice\'s Fixed Schedule');
            expect(schedule.day_of_week).toBe('Monday');
        });

        test('should throw error when retrieving a non-existing schedule', async () => {
            await expect(scheduleService.getScheduleById(999, 1))
                .rejects
                .toThrow('Schedule not found');
        });
    });

});
