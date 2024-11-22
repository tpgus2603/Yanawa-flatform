// services/scheduleService.js
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');
const {Schedule} = require('../models');
const ScheduleResponseDTO = require('../dtos/ScheduleResponseDTO');

class scheduleService {
  /**
   * 트랜잭션 래퍼 함수
   */
  async withTransaction(callback) {
        const transaction = await sequelize.transaction(); // 직접 sequelize 사용
        try {
            const result = await callback(transaction);
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

  /**
   * 공통 where 절 생성
   */
  getScheduleWhereClause(userId, id = null) {
    const where = {
      user_id: userId,
      [Op.or]: [
        { is_fixed: true },
        {
          is_fixed: false,
          expiry_date: { [Op.gt]: new Date() },
        },
      ],
    };

    if (id) {
      where.id = id;
    }

    return where;
  }

  /**
   * 스케줄 유효성 검사
   * 이미 컨트롤러에서 검증했으므로, 추가 검증 필요 시 수행
   */
  validateScheduleTime(start_time, end_time) {
    if (new Date(start_time) >= new Date(end_time)) {
      throw new Error("Start time must be before end time");
    }
  }

  /**
   * 유동 스케줄 만료일 구하기
   */
  getNextMonday(startTime) {
    const date = new Date(startTime);
    const day = date.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysUntilNextMonday = (8 - day) % 7 || 7; // Ensure next Monday

    const nextMonday = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + daysUntilNextMonday,
        0,
        0,
        0,
        0 // Set to midnight UTC
      )
    );

    return nextMonday;
  }

  /**
   * 사용자 스케줄 생성
   */
  async createSchedule({ userId, title, start_time, end_time, is_fixed }) {
    const schedule = await this.withTransaction(async (transaction) => {
      this.validateScheduleTime(start_time, end_time);

      const overlap = await this.checkScheduleOverlap(
        userId,
        start_time,
        end_time
      );
      if (overlap) {
        throw new Error("Schedule overlaps with existing schedule");
      }

      const scheduleData = {
        user_id: userId,
        title,
        start_time,
        end_time,
        is_fixed,
        expiry_date: is_fixed ? null : this.getNextMonday(start_time),
      };

      return Schedule.create(scheduleData, { transaction });
    });

    return new ScheduleResponseDTO(schedule);
  }

  /**
   * 사용자 스케줄 수정
   */
  async updateSchedule(id, userId, updateData) {
    const updatedSchedule = await this.withTransaction(async (transaction) => {
      const schedule = await Schedule.findOne({
        where: { id, user_id: userId },
        transaction,
      });

      if (!schedule) {
        throw new Error("Schedule not found");
      }

      // 이미 컨트롤러에서 검증했으므로, 추가 검증이 필요하다면 수행
      if (updateData.start_time && updateData.end_time) {
        this.validateScheduleTime(updateData.start_time, updateData.end_time);
      }

      const overlap = await this.checkScheduleOverlap(
        userId,
        updateData.start_time || schedule.start_time,
        updateData.end_time || schedule.end_time,
        id
      );
      if (overlap) {
        throw new Error("Schedule overlaps with existing schedule");
      }

      const is_fixed = schedule.is_fixed;
      const updatedDataWithExpiry = {
        ...updateData,
        expiry_date: is_fixed
          ? null
          : this.getNextMonday(updateData.start_time || schedule.start_time),
        updatedAt: new Date(),
      };
      delete updatedDataWithExpiry.is_fixed;

      return schedule.update(updatedDataWithExpiry, { transaction });
    });

    return new ScheduleResponseDTO(updatedSchedule);
  }

  /**
   * 사용자 스케줄 삭제
   */
  async deleteSchedule(id, userId) {
    return this.withTransaction(async (transaction) => {
      const result = await Schedule.destroy({
        where: { id, user_id: userId },
        transaction,
      });

      if (!result) {
        throw new Error("Schedule not found");
      }

      // 삭제 성공 메시지 반환
      return { message: "Schedule successfully deleted" };
    });
  }

  /**
   * 해당 사용자의 스케줄 정보 조회
   */
  async getAllSchedules(userId) {
    try {
      const schedules = await Schedule.findAll({
        where: this.getScheduleWhereClause(userId),
        order: [["start_time", "ASC"]],
      });
      const schedulesDTO = schedules.map(
        (schedule) => new ScheduleResponseDTO(schedule)
      );
      return schedulesDTO;
    } catch (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`);
    }
  }

  /**
   * 해당 사용자의 특정 스케줄 조회
   */
  async getScheduleById(id, userId) {
    try {
      const schedule = await Schedule.findOne({
        where: this.getScheduleWhereClause(userId, id),
      });

      if (!schedule) {
        throw new Error("Schedule not found");
      }

      return new ScheduleResponseDTO(schedule);
    } catch (error) {
      throw new Error(`Failed to fetch schedule: ${error.message}`);
    }
  }

  /**
   * 만료된 유동 스케줄 정리
   */
  async cleanExpiredSchedules() {
    try {
      await Schedule.destroy({
        where: {
          is_fixed: false,
          expiry_date: { [Op.lte]: new Date() },
        },
      });
    } catch (error) {
      throw new Error(`Failed to clean expired schedules: ${error.message}`);
    }
  }

  /**
   * 스케줄 중복 검사
   */
  async checkScheduleOverlap(userId, start_time, end_time, excludeId = null) {
    try {
      const where = {
        user_id: userId,
        [Op.or]: [
          {
            [Op.and]: [
              { start_time: { [Op.lte]: start_time } },
              { end_time: { [Op.gte]: start_time } },
            ],
          },
          {
            [Op.and]: [
              { start_time: { [Op.gte]: start_time } },
              { start_time: { [Op.lte]: end_time } },
            ],
          },
        ],
      };

      if (excludeId) {
        where.id = { [Op.ne]: excludeId };
      }

      const overlappingSchedule = await Schedule.findOne({ where });
      return overlappingSchedule;
    } catch (error) {
      throw new Error(`Failed to check schedule overlap: ${error.message}`);
    }
  }
}

module.exports = new scheduleService();
