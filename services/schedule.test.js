// test/schedule.test.js

const sequelize = require('../config/sequelize');
const User = require('../models/User');
const Friend = require('../models/Friend');
const Schedule = require('../models/Schedule');
const scheduleService = require('./scheduleService'); 

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
  await Schedule.create({
    id: 1,
    user_id: 1,
    title: 'Alice\'s Fixed Schedule',
    start_time: new Date('2024-05-01T09:00:00Z'),
    end_time: new Date('2024-05-01T10:00:00Z'),
    is_fixed: true,
    expiry_date: null,
  });

  await Schedule.create({
    id: 2,
    user_id: 1,
    title: 'Alice\'s Flexible Schedule',
    start_time: new Date('2024-05-02T11:00:00Z'),
    end_time: new Date('2024-05-02T12:00:00Z'),
    is_fixed: false,
    expiry_date: new Date('2024-05-08T00:00:00Z'), // 다음 월요일
  });
});

afterAll(async () => {
  // 데이터베이스 연결 종료
  await sequelize.close();
});

describe('Schedule Service', () => {
  describe('createSchedule', () => {
    test('should create a new fixed schedule successfully', async () => {
      const scheduleData = {
        userId: 2,
        title: 'Bob\'s Fixed Schedule',
        start_time: new Date('2024-05-03T14:00:00Z'),
        end_time: new Date('2024-05-03T15:00:00Z'),
        is_fixed: true,
      };

      const schedule = await scheduleService.createSchedule(scheduleData);
      

      expect(schedule).toBeDefined();
      expect(schedule.user_id).toBe(2);
      expect(schedule.title).toBe('Bob\'s Fixed Schedule');
      expect(schedule.is_fixed).toBe(true);
      expect(schedule.expiry_date).toBeNull();
    });

    test('should create a new flexible schedule with expiry date', async () => {
      const scheduleData = {
        userId: 2,
        title: 'Bob\'s Flexible Schedule',
        start_time: new Date('2024-05-04T16:00:00Z'),
        end_time: new Date('2024-05-04T17:00:00Z'),
        is_fixed: false,
      };

      const schedule = await scheduleService.createSchedule(scheduleData);

      expect(schedule).toBeDefined();
      expect(schedule.user_id).toBe(2);
      expect(schedule.title).toBe('Bob\'s Flexible Schedule');
      expect(schedule.is_fixed).toBe(false);
      expect(schedule.expiry_date).toBeInstanceOf(Date);

      // expiry_date가 다음 월요일로 설정되었는지 확인
      const expectedExpiryDate = new Date('2024-05-06T00:00:00Z'); // 2024-05-06은 다음 월요일
      expect(schedule.expiry_date.toISOString()).toBe(expectedExpiryDate.toISOString());
    });

    test('should throw error when schedule times overlap with existing schedule', async () => {
      const scheduleData = {
        userId: 1,
        title: 'Alice\'s Overlapping Schedule',
        start_time: new Date('2024-05-01T09:30:00Z'), // 기존 스케줄과 겹침
        end_time: new Date('2024-05-01T10:30:00Z'),
        is_fixed: false,
      };

      await expect(scheduleService.createSchedule(scheduleData)).rejects.toThrow('Schedule overlaps with existing schedule');
    });

    test('should throw error when start_time is after end_time', async () => {
      const scheduleData = {
        userId: 1,
        title: 'Invalid Schedule',
        start_time: new Date('2024-05-05T18:00:00Z'),
        end_time: new Date('2024-05-05T17:00:00Z'), // start_time이 더 나중
        is_fixed: false,
      };

      await expect(scheduleService.createSchedule(scheduleData)).rejects.toThrow('Start time must be before end time');
    });
  });

  describe('updateSchedule', () => {
    test('should update an existing schedule successfully', async () => {
      const updateData = {
        title: 'Alice\'s Updated Flexible Schedule',
        start_time: new Date('2024-05-02T11:30:00Z'),
        end_time: new Date('2024-05-02T12:30:00Z'),
      };

      const updatedSchedule = await scheduleService.updateSchedule(2, 1, updateData);

      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule.title).toBe('Alice\'s Updated Flexible Schedule');
      expect(updatedSchedule.start_time.toISOString()).toBe(new Date('2024-05-02T11:30:00Z').toISOString());
      expect(updatedSchedule.end_time.toISOString()).toBe(new Date('2024-05-02T12:30:00Z').toISOString());
      expect(updatedSchedule.expiry_date).toBeInstanceOf(Date);
    });

    test('should throw error when updating a non-existing schedule', async () => {
      const updateData = {
        title: 'Non-existing Schedule',
        start_time: new Date('2024-05-06T10:00:00Z'),
        end_time: new Date('2024-05-06T11:00:00Z'),
      };

      await expect(scheduleService.updateSchedule(999, 1, updateData)).rejects.toThrow('Schedule not found');
    });

    test('should throw error when updated schedule overlaps with existing schedule', async () => {
      const updateData = {
        title: 'Alice\'s Overlapping Update',
        start_time: new Date('2024-05-01T09:30:00Z'), // 기존 스케줄과 겹침
        end_time: new Date('2024-05-01T10:30:00Z'),
      };

      await expect(scheduleService.updateSchedule(2, 1, updateData)).rejects.toThrow('Schedule overlaps with existing schedule');
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
        await expect(scheduleService.deleteSchedule(999, 1)).rejects.toThrow('Schedule not found');
    });
});

  describe('getAllSchedules', () => {
    test('should retrieve all valid schedules for a user', async () => {
      // 사용자 Alice의 모든 스케줄 조회
      const schedules = await scheduleService.getAllSchedules(1);

      expect(schedules.length).toBe(1); // id=1 스케줄은 is_fixed=true
      expect(schedules[0].title).toBe('Alice\'s Fixed Schedule');
    });
  });

  describe('getScheduleById', () => {
    test('should retrieve a specific schedule by ID', async () => {
      const schedule = await scheduleService.getScheduleById(1, 1);

      expect(schedule).toBeDefined();
      expect(schedule.title).toBe('Alice\'s Fixed Schedule');
    });

    test('should throw error when retrieving a non-existing schedule', async () => {
      await expect(scheduleService.getScheduleById(999, 1)).rejects.toThrow('Schedule not found');
    });
  });
  // test/schedule.test.js

  describe('cleanExpiredSchedules', () => {
    test('should delete expired flexible schedules', async () => {
        // 현재 날짜를 기준으로 만료된 스케줄과 만료되지 않은 스케줄 생성
        const now = new Date('2024-05-07T00:00:00Z'); // 테스트를 위한 고정된 현재 날짜

        // Jest의 Fake Timers를 사용하여 Date를 고정
        jest.useFakeTimers('modern');
        jest.setSystemTime(now);

        // 만료된 유동 스케줄 생성
        await Schedule.create({
            user_id: 1,
            title: 'Expired Flexible Schedule',
            start_time: new Date('2024-04-25T10:00:00Z'),
            end_time: new Date('2024-04-25T11:00:00Z'),
            is_fixed: false,
            expiry_date: new Date('2024-05-06T00:00:00Z'), // 이미 만료됨
        });

        // 만료되지 않은 유동 스케줄 생성
        await Schedule.create({
            user_id: 1,
            title: 'Valid Flexible Schedule',
            start_time: new Date('2024-05-07T10:00:00Z'),
            end_time: new Date('2024-05-07T11:00:00Z'),
            is_fixed: false,
            expiry_date: new Date('2024-05-14T00:00:00Z'), // 아직 만료되지 않음
        });

        // 만료된 스케줄 정리
        await scheduleService.cleanExpiredSchedules();

        // 만료된 스케줄이 삭제되었는지 확인
        const expiredSchedule = await Schedule.findOne({ where: { title: 'Expired Flexible Schedule' } });
        expect(expiredSchedule).toBeNull();

        // 만료되지 않은 스케줄은 남아있는지 확인
        const validSchedule = await Schedule.findOne({ where: { title: 'Valid Flexible Schedule' } });
        expect(validSchedule).toBeDefined();
        expect(validSchedule.title).toBe('Valid Flexible Schedule');

        // Jest의 Fake Timers를 복구
        jest.useRealTimers();
    });
});
  
});
