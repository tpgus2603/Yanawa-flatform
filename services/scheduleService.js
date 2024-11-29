// services/scheduleService.js
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');
const Schedule = require('../models/schedule');
const ScheduleResponseDTO = require('../dtos/ScheduleResponseDTO');

class ScheduleService {
    /**
     * 스케줄 생성 (벌크)
     * @param {object} [transaction] - Sequelize 트랜잭션 객체 -> 미팅방에서 쓰기위해 트랜잭션을 넘겨받는걸 추가 
     */
    async createSchedules({ userId, title, is_fixed, events }, transaction = null) {
        const scheduleDTOs = [];

        for (const event of events) {
            const { time_idx } = event;

            // 중복 스케줄 검사
            const overlap = await this.checkScheduleOverlap(userId, time_idx, transaction);
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
    }

    /**
     * 스케줄 수정 (벌크)
     * @param {Array} updates - 수정할 스케줄 배열
     */
    async updateSchedules(userId, updates, transaction = null) {
        const updatedSchedules = [];

        for (const update of updates) {
            const { time_idx, title, is_fixed } = update;

            const schedule = await Schedule.findOne({
                where: { user_id: userId, time_idx },
                transaction,
            });

            if (!schedule) {
                throw new Error(`Schedule not found at time_idx ${time_idx}`);
            }

            const updatedData = {};
            if (title !== undefined) updatedData.title = title;
            if (is_fixed !== undefined) updatedData.is_fixed = is_fixed;

            const updatedSchedule = await schedule.update(updatedData, { transaction });
            updatedSchedules.push(new ScheduleResponseDTO(updatedSchedule));
        }

        return updatedSchedules;
    }

    /**
     * 스케줄 삭제 (벌크)
     * @param {number} userId - 사용자 ID
     * @param {Array<number>} time_idxs - 삭제할 스케줄의 time_idx 배열
     * @param {object} [transaction] - Sequelize 트랜잭션 객체
     */
    async deleteSchedules(userId, time_idxs, transaction = null) {
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
    async checkScheduleOverlap(userId, time_idx, transaction = null) {
        const overlappingSchedule = await Schedule.findOne({
            where: { user_id: userId, time_idx },
            transaction,
        });

        return !!overlappingSchedule;
    }

    async checkScheduleOverlapByTime(userId, time_idx_start, time_idx_end, transaction = null) {
        console.log(
            `checkScheduleOverlapByTime 호출: userId=${userId}, time_idx_start=${time_idx_start}, time_idx_end=${time_idx_end}`
        );
        const overlappingSchedule = await Schedule.findOne({
            where: {
                user_id: userId,
                time_idx: {
                    [Op.between]: [time_idx_start, time_idx_end] 
                }
            },
            transaction,
        });
         console.log(`중복 스케줄: ${JSON.stringify(overlappingSchedule)}`);
    const result = !!overlappingSchedule;
    console.log(`스케줄 충돌 결과: ${result}`);
    return result;
    }
    

    /**
     * 만료된 스케줄 삭제
     */
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
