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
    

}