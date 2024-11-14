const { Op } = require('sequelize');
const Schedule = require('../models/Schedule');

class schedulService {

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
        try {

            // 일정 시작 시간 - 종료 시간 유효성 검사
            if (new Date(start_time) >= new Date(end_time)) {
                throw new Error('Start time must be before end time');
            }

            // 중복 검사
            const overlap = await this.checkScheduleOverlap(userId, start_time, end_time);
            if (overlap) {
                throw new Error('Schedule overlaps with existing schedule');
            }

            const scehduleData = {
                user_id: userId,
                title,
                start_time,
                end_time,
                is_fixed,
                expiry_date: is_fixed ? null : this.getNextMonday()
            };

            const schedule = await Schedule.create(scehduleData);
            return schedule;
        } catch (error) {
            throw new Error(`Failed to create schedule: ${error.message}`);
        }
    }

    /**
     * 사용자 스케줄 수정
     */
    async updateSchedule(id, userId, updateData) {
        try {
            const schedule = await Schedule.findOne({
                where: { id, user_id: userId }
            });

            if (!schedule) {
                throw new Error('schedule not found');
            }

            // 일정 시작 시간 - 종료 시간 유효성 검사
            if (new Date(updateData.start_time) >= new Date(updateData.end_time)) {
                throw new Error('Start time must be before end time');
            }

            // 중복 검사
            const overlap = await this.checkScheduleOverlap(userId, updateData.start_time, updateData.end_time);
            if (overlap) {
                throw new Error('Schedule overlaps with existing schedule');
            }

            // 스케줄 타입 변경하지 못하도록 update값 삭제 -> 기존값 유지
            delete updateData.is_fixed;
            
            await schedule.update(updateData);
            return schedule;
        } catch (error) {
            throw new Error(`Failed to update schedule: ${error.message}`);
        }
    }
 
    /**
     * 사용자 스케줄 삭제
     */
    async deleteSchedule(id, userId) {
        try {
            const schedule = await Schedule.destroy({
                where: { id, user_id: userId }
            });

            if (!schedule) {
                throw new Error('schedule not found');
            }

            return true;
        } catch (error) {
            throw new Error(`Failed to delete schedule: ${error.message}`);
        }
    }
    
    /**
     * 해당 사용자의 스케줄 정보 조회
     */
    async getAllSchedules(userId) {
        try {
            const schedules = await Schedule.findAll({
                where: {
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
                },
                order: [['start_time', 'ASC']]
            });
            return schedules;
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
                where: {
                    id,
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
                }
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
