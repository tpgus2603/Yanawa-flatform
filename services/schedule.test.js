// test/scheduleService.test.js
const sequelize = require('../config/sequelize'); 
const { Schedule, User } = require('../models');
const ScheduleService = require('../services/scheduleService'); 
const ScheduleResponseDTO = require('../dtos/ScheduleResponseDTO');

beforeAll(async () => {
    await sequelize.sync({ force: true });
});

beforeEach(async () => {
    await Schedule.destroy({ where: {} });
    await User.destroy({ where: {} });

    // 더미 사용자 생성
    await User.bulkCreate([
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    ]);

    // 더미 스케줄 생성
    await Schedule.bulkCreate([
        { id: 1, user_id: 1, title: 'Alice Fixed Schedule 1', time_idx: 36, is_fixed: true },
        { id: 2, user_id: 1, title: 'Alice Flexible Schedule 1', time_idx: 44, is_fixed: false },
        { id: 3, user_id: 2, title: 'Bob Fixed Schedule 1', time_idx: 60, is_fixed: true },
        { id: 4, user_id: 2, title: 'Bob Flexible Schedule 1', time_idx: 61, is_fixed: false },
        { id: 5, user_id: 3, title: 'Charlie Fixed Schedule 1', time_idx: 100, is_fixed: true },
    ]);
});

afterAll(async () => {
    await sequelize.close();
});

describe('ScheduleService', () => {
    describe('createSchedules', () => {
        test('should create multiple new fixed schedules successfully', async () => {
            const scheduleData = {
                userId: 1,
                title: 'Alice Fixed Schedule Bulk',
                is_fixed: true,
                events: [
                    { time_idx: 50 }, // Valid time_idx
                    { time_idx: 51 },
                ],
            };

            const schedules = await ScheduleService.createSchedules(scheduleData);

            expect(schedules).toBeDefined();
            expect(Array.isArray(schedules)).toBe(true);
            expect(schedules.length).toBe(2);

            schedules.forEach((schedule, index) => {
                expect(schedule.user_id).toBe(1);
                expect(schedule.title).toBe('Alice Fixed Schedule Bulk');
                expect(schedule.is_fixed).toBe(true);
                expect(schedule.time_idx).toBe(scheduleData.events[index].time_idx);
            });

            // 데이터베이스에 실제로 추가되었는지 확인
            const dbSchedules = await Schedule.findAll({
                where: { user_id: 1, title: 'Alice Fixed Schedule Bulk' },
            });
            expect(dbSchedules.length).toBe(2);
        });

        test('should create multiple new flexible schedules successfully', async () => {
            const scheduleData = {
                userId: 2,
                title: 'Bob Flexible Schedule Bulk',
                is_fixed: false,
                events: [
                    { time_idx: 62 },
                    { time_idx: 63 },
                ],
            };

            const schedules = await ScheduleService.createSchedules(scheduleData);

            expect(schedules).toBeDefined();
            expect(Array.isArray(schedules)).toBe(true);
            expect(schedules.length).toBe(2);

            schedules.forEach((schedule, index) => {
                expect(schedule.user_id).toBe(2);
                expect(schedule.title).toBe('Bob Flexible Schedule Bulk');
                expect(schedule.is_fixed).toBe(false);
                expect(schedule.time_idx).toBe(scheduleData.events[index].time_idx);
            });

            // 데이터베이스에 실제로 추가되었는지 확인
            const dbSchedules = await Schedule.findAll({
                where: { user_id: 2, title: 'Bob Flexible Schedule Bulk' },
            });
            expect(dbSchedules.length).toBe(2);
        });

        test('should throw error when creating schedules with overlapping time_idx', async () => {
            const scheduleData = {
                userId: 1,
                title: 'Alice Overlapping Schedule',
                is_fixed: false,
                events: [
                    { time_idx: 36 }, // Existing schedule for Alice
                ],
            };

            await expect(ScheduleService.createSchedules(scheduleData))
                .rejects
                .toThrow('Schedule overlaps with existing schedule at time_idx 36');
        });

        test('should throw error when creating schedules with invalid time_idx', async () => {
            const scheduleData = {
                userId: 1,
                title: 'Alice Invalid Schedule',
                is_fixed: false,
                events: [
                    { time_idx: 700 }, // Invalid time_idx
                ],
            };

            await expect(ScheduleService.createSchedules(scheduleData))
                .rejects
                .toThrow('Validation error: Validation max on time_idx failed');
        });
    });

    describe('updateSchedules', () => {
        test('should update multiple existing schedules successfully', async () => {
            const updateData = {
                updates: [
                    { time_idx: 36, title: 'Alice Updated Fixed Schedule', is_fixed: true },
                    { time_idx: 44, title: 'Alice Updated Flexible Schedule', is_fixed: false },
                ],
            };

            const updatedSchedules = await ScheduleService.updateSchedules(1, updateData.updates);

            expect(updatedSchedules).toBeDefined();
            expect(Array.isArray(updatedSchedules)).toBe(true);
            expect(updatedSchedules.length).toBe(2);

            updatedSchedules.forEach((schedule, index) => {
                expect(schedule.title).toBe(updateData.updates[index].title);
                expect(schedule.is_fixed).toBe(updateData.updates[index].is_fixed);
                expect(schedule.time_idx).toBe(updateData.updates[index].time_idx);
            });

            // 데이터베이스에서 업데이트 확인
            const dbSchedule1 = await Schedule.findOne({ where: { user_id: 1, time_idx: 36 } });
            const dbSchedule2 = await Schedule.findOne({ where: { user_id: 1, time_idx: 44 } });

            expect(dbSchedule1.title).toBe('Alice Updated Fixed Schedule');
            expect(dbSchedule2.title).toBe('Alice Updated Flexible Schedule');
        });

        test('should throw error when updating a non-existing schedule', async () => {
            const updateData = {
                updates: [
                    { time_idx: 999, title: 'Non-existing Schedule' },
                ],
            };

            await expect(ScheduleService.updateSchedules(1, updateData.updates))
                .rejects
                .toMatchObject({ message: 'Schedule not found at time_idx 999' });
        });

        test('should throw error when creating schedules with overlapping time_idx', async () => {
            // 먼저, 새로운 스케줄을 생성하여 time_idx 50을 사용
            await ScheduleService.createSchedules({
                userId: 1,
                title: 'Alice Another Schedule',
                is_fixed: false,
                events: [
                    { time_idx: 50 },
                ],
            });

            // 동일한 time_idx로 스케줄을 생성하려 할 때 오류가 발생하는지 테스트
            const scheduleData = {
                userId: 1,
                title: 'Alice Overlapping Schedule',
                is_fixed: false,
                events: [
                    { time_idx: 50 }, // 이미 존재하는 time_idx
                ],
            };

            await expect(ScheduleService.createSchedules(scheduleData))
                .rejects
                .toThrow('Schedule overlaps with existing schedule at time_idx 50');
        });
    });

    describe('deleteSchedules', () => {
        test('should delete multiple existing schedules successfully', async () => {
            // 먼저, 스케줄 생성
            await ScheduleService.createSchedules({
                userId: 1,
                title: 'Alice Bulk Delete Schedule 1',
                is_fixed: false,
                events: [
                    { time_idx: 70 },
                    { time_idx: 71 },
                ],
            });

            const deleteData = {
                time_idxs: [70, 71],
            };

            const result = await ScheduleService.deleteSchedules(1, deleteData.time_idxs);

            expect(result).toBeDefined();
            expect(result.deleted_time_idxs).toContain(70);
            expect(result.deleted_time_idxs).toContain(71);

            // 데이터베이스에서 삭제 확인
            const dbSchedule1 = await Schedule.findOne({ where: { user_id: 1, time_idx: 70 } });
            const dbSchedule2 = await Schedule.findOne({ where: { user_id: 1, time_idx: 71 } });

            expect(dbSchedule1).toBeNull();
            expect(dbSchedule2).toBeNull();
        });

        test('should throw error when deleting a non-existing schedule', async () => {
            const deleteData = {
                time_idxs: [999],
            };

            await expect(ScheduleService.deleteSchedules(1, deleteData.time_idxs))
                .rejects
                .toThrow('Schedule not found at time_idx 999');
        });
    });

    describe('getAllSchedules', () => {
        test('should retrieve all schedules for a user', async () => {
            // Update schedules first
            const updateData = {
                updates: [
                    { time_idx: 36, title: 'Alice Updated Fixed Schedule', is_fixed: true },
                    { time_idx: 44, title: 'Alice Updated Flexible Schedule', is_fixed: false },
                ],
            };

            await ScheduleService.updateSchedules(1, updateData.updates);

            const schedules = await ScheduleService.getAllSchedules(1);

            expect(schedules).toBeDefined();
            expect(Array.isArray(schedules)).toBe(true);

            // 현재 Alice는 id=1, time_idx=36 (fixed), time_idx=44 (flexible)이 존재
            expect(schedules.length).toBe(2);

            const schedule1 = schedules.find(s => s.time_idx === 36);
            const schedule2 = schedules.find(s => s.time_idx === 44);

            expect(schedule1).toBeDefined();
            expect(schedule1.title).toBe('Alice Updated Fixed Schedule');

            expect(schedule2).toBeDefined();
            expect(schedule2.title).toBe('Alice Updated Flexible Schedule');
        });

        test('should retrieve one schedule when user has only one', async () => {
            const schedules = await ScheduleService.getAllSchedules(3); 

            expect(schedules).toBeDefined();
            expect(Array.isArray(schedules)).toBe(true);
            expect(schedules.length).toBe(1);

            expect(schedules[0].title).toBe('Charlie Fixed Schedule 1');
        });
    });

    describe('getScheduleByTimeIdx', () => {
        test('should retrieve a specific schedule by time_idx', async () => {
            // Update schedule first
            const updateData = {
                updates: [
                    { time_idx: 36, title: 'Alice Updated Fixed Schedule', is_fixed: true },
                ],
            };

            await ScheduleService.updateSchedules(1, updateData.updates);

            const schedule = await ScheduleService.getScheduleByTimeIdx(1, 36);

            expect(schedule).toBeDefined();
            expect(schedule.title).toBe('Alice Updated Fixed Schedule');
            expect(schedule.time_idx).toBe(36);
        });

        test('should throw error when retrieving a non-existing schedule', async () => {
            await expect(ScheduleService.getScheduleByTimeIdx(1, 999))
                .rejects
                .toThrow('Schedule not found');
        });
    });

    describe('cleanExpiredSchedules', () => {
        test('should delete all flexible schedules', async () => {
            // 여러 유동 스케줄을 생성
            await ScheduleService.createSchedules({
                userId: 1,
                title: 'Alice Flexible Schedule 2',
                is_fixed: false,
                events: [
                    { time_idx: 80 },
                    { time_idx: 81 },
                ],
            });

            await ScheduleService.createSchedules({
                userId: 2,
                title: 'Bob Flexible Schedule 2',
                is_fixed: false,
                events: [
                    { time_idx: 90 },
                    { time_idx: 91 },
                ],
            });

            // 유동 스케줄 삭제
            await ScheduleService.cleanExpiredSchedules();

            // 데이터베이스에서 유동 스케줄이 모두 삭제되었는지 확인
            const remainingFlexibleSchedules = await Schedule.findAll({
                where: { is_fixed: false },
            });

            expect(remainingFlexibleSchedules.length).toBe(0);
        });

        test('should not delete fixed schedules', async () => {
            // 여러 고정 스케줄을 생성
            await ScheduleService.createSchedules({
                userId: 3,
                title: 'Charlie Fixed Schedule 2',
                is_fixed: true,
                events: [
                    { time_idx: 120 },
                    { time_idx: 121 },
                ],
            });

            // 유동 스케줄 삭제
            await ScheduleService.cleanExpiredSchedules();

            // 데이터베이스에서 고정 스케줄이 유지되었는지 확인
            const remainingFixedSchedules = await Schedule.findAll({
                where: { user_id: 3, is_fixed: true },
            });

            expect(remainingFixedSchedules.length).toBe(3); 
        });
    });
});
