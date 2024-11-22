// services/scheduleService.js
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');
const Schedule = require('../models/Schedule');
const ScheduleResponseDTO = require('../dtos/ScheduleResponseDTO');

class ScheduleService {
    /**
     * 스케줄 생성 (벌크)
     */
    async createSchedules({ userId, title, is_fixed, events }) {
        return await sequelize.transaction(async (transaction) => {
            const scheduleDTOs = [];

            for (const event of events) {
                const { time_idx } = event;

                // 중복 스케줄 검사
                const overlap = await this.checkScheduleOverlap(
                    userId,
                    time_idx,
                    transaction
                );

                if (overlap) {
                    throw new Error(`Schedule overlaps with existing schedule at time_idx ${time_idx}`);
                }

                const scheduleData = {
                    user_id: userId,
                    title,
                    time_idx,
                    is_fixed,
                };

                const schedule = await Schedule.create(scheduleData, { transaction });
                scheduleDTOs.push(new ScheduleResponseDTO(schedule));
            }

            return scheduleDTOs;
        });
    }

    /**
     * 스케줄 수정 (벌크)
     */
    async updateSchedules(userId, updates) {
        return await sequelize.transaction(async (transaction) => {
            const updatedSchedules = [];

            for (const update of updates) {
                const { time_idx, title, is_fixed } = update;

                const schedule = await Schedule.findOne({
                    where: { user_id: userId, time_idx },
                    transaction,
                });

                if (!schedule) {
                    throw { code: 'SCHEDULE_NOT_FOUND', message: `Schedule not found at time_idx ${time_idx}` };
                }

                // 중복 스케줄 검사 (time_idx는 고유하므로 필요 없음)
                // 만약 다른 필드를 기반으로 중복을 검사한다면 추가 로직 필요

                const updatedData = {};
                if (title !== undefined) updatedData.title = title;
                if (is_fixed !== undefined) updatedData.is_fixed = is_fixed;

                const updatedSchedule = await schedule.update(updatedData, { transaction });
                updatedSchedules.push(new ScheduleResponseDTO(updatedSchedule));
            }

            return updatedSchedules;
        });
    }

    /**
     * 스케줄 삭제 (벌크)
     */
    async deleteSchedules(userId, time_idxs) {
        return await sequelize.transaction(async (transaction) => {
            const deleted_time_idxs = [];

            for (const time_idx of time_idxs) {
                const deletedCount = await Schedule.destroy({
                    where: { user_id: userId, time_idx },
                    transaction,
                });

                if (deletedCount === 0) {
                    throw new Error(`Schedule not found at time_idx ${time_idx}`);
                }

                deleted_time_idxs.push(time_idx);
            }

            return { deleted_time_idxs };
        });
    }

    /**
     * 특정 time_idx로 스케줄 조회
     */
    async getScheduleByTimeIdx(userId, time_idx) {
        const schedule = await Schedule.findOne({
            where: { user_id: userId, time_idx },
        });

        if (!schedule) {
            throw new Error('Schedule not found');
        }

        return new ScheduleResponseDTO(schedule);
    }

    /**
     * 모든 스케줄 조회
     */
    async getAllSchedules(userId) {
        try {
            const schedules = await Schedule.findAll({
                where: { user_id: userId },
                order: [['time_idx', 'ASC']],
            });
            return schedules.map((schedule) => new ScheduleResponseDTO(schedule));
        } catch (error) {
            throw new Error(`Failed to fetch schedules: ${error.message}`);
        }
    }

    /**
     * 중복 스케줄 검사
     */
    async checkScheduleOverlap(userId, time_idx, transaction) {
        const overlappingSchedule = await Schedule.findOne({
            where: { user_id: userId, time_idx },
            transaction,
        });

        return !!overlappingSchedule;
    }

    async cleanExpiredSchedules() {
        try {
            const deletedCount = await Schedule.destroy({
                where: { is_fixed: false },
            });
            //console.log(`Deleted ${deletedCount} flexible schedules.`);
        } catch (error) {
            console.error('Failed to clean expired schedules:', error);
            throw error;
        }
    }
}

module.exports = new ScheduleService();
