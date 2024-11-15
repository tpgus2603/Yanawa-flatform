const { Op } = require('sequelize');
const Schedule = require('../models/Schedule');

class scheduleService {

    /**
     * transactin wrapper 함수
     */
    async withTransaction(callback) {
        const transaction = await Schedule.sequelize.transaction();
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
                    expiry_date: {
                        [Op.gt]: new Date()
                    }
                }
            ]
        };

        if (id) {
            where.id = id;
        }

        return where;
    }

    /**
     * 스케줄 유효성 검사
     */
    validateScheduleTime(start_time, end_time) {
        if (new Date(start_time) >= new Date(end_time)) {
            throw new Error('Start time must be before end time');
        }
    }

    /**
     * 유동 스케줄 만료일 구하기
     */
    getNextMonday() {
        const date = new Date();
        const day = date.getDay();
        const daysUntilNextMonday = (8 - day) % 7;
        date.setDate(date.getDate() + daysUntilNextMonday);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    /**
     * 사용자 스케줄 생성
     */
    async createSchedule({ userId, title, start_time, end_time, is_fixed }) {
        return this.withTransaction(async (transaction) => {
            this.validateScheduleTime(start_time, end_time);

            const overlap = await this.checkScheduleOverlap(userId, start_time, end_time);
            if (overlap) {
                throw new Error('Schedule overlaps with existing schedule');
            }

            const scheduleData = {
                user_id: userId,
                title,
                start_time,
                end_time,
                is_fixed,
                expiry_date: is_fixed ? null : this.getNextMonday()
            };

            return Schedule.create(scheduleData, { transaction });
        });
    }

    /**
     * 사용자 스케줄 수정
     */
    async updateSchedule(id, userId, updateData) {
        return this.withTransaction(async (transaction) => {
            const schedule = await Schedule.findOne({
                where: { id, user_id: userId },
                transaction
            });

            if (!schedule) {
                throw new Error('Schedule not found');
            }

            this.validateScheduleTime(updateData.start_time, updateData.end_time);

            const overlap = await this.checkScheduleOverlap(
                userId, 
                updateData.start_time, 
                updateData.end_time,
                id
            );
            if (overlap) {
                throw new Error('Schedule overlaps with existing schedule');
            }

            delete updateData.is_fixed;
            return schedule.update(updateData, { transaction });
        });
    }
 
    /**
     * 사용자 스케줄 삭제
     */
    async deleteSchedule(id, userId) {
        return this.withTransaction(async (transaction) => {
            const result = await Schedule.destroy({
                where: { id, user_id: userId },
                transaction
            });

            if (!result) {
                throw new Error('Schedule not found');
            }

            return true;
        });
    }
    
    /**
     * 해당 사용자의 스케줄 정보 조회
     */
    async getAllSchedules(userId) {
        try {
            return Schedule.findAll({
                where: this.getScheduleWhereClause(userId),
                order: [['start_time', 'ASC']]
            });
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
                where: this.getScheduleWhereClause(userId, id)
            });
            
            if (!schedule) {
                throw new Error('Schedule not found');
            }
            
            return schedule;
        } catch (error) {
            throw new Error(`Failed to fetch schedule: ${error.message}`);
        }
    }
    
    
    /**
     * 만료된 유동 스케줄 정리 -> utils에 cron job 추가해서 실행하도록 설정
     */
    async cleanExpiredSchedules() {
        try {
            await Schedule.destroy({
                where: {
                    is_fixed: false,
                    expiry_date: {
                        [Op.lte]: new Date()
                    }
                }
            });
        } catch (error) {
            throw new Error(`Failed to clean expired schedules: ${error.message}`);
        }
    }


    /**
     * 스케줄 중복 검사 -> 기존 스케줄 시간대에 추가 못하도록
     */
    async checkScheduleOverlap(userId, start_time, end_time, excludeId = null) {
        try {
            const where = {
                user_id: userId,
                [Op.or]: [
                    {
                        // 새로운 스케줄이 기존 스케줄 내 존재
                        [Op.and]: [
                            { start_time: { [Op.lte]: start_time } },
                            { end_time: { [Op.gte]: start_time } }
                        ]
                    },
                    {
                        // 새로운 스케줄이 기존 스케줄을 포함
                        [Op.and]: [
                            { start_time: { [Op.gte]: start_time } },
                            { start_time: { [Op.lte]: end_time } }
                        ]
                    }
                ]
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
