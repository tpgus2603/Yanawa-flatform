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

}