const cron = require('node-cron');
const scheduleService = require('../services/scheduleService');

// 매주 월요일 자정에 유동 스케줄 삭제하기
const initScheduleCleaner = () => {
    cron.schedule('0 0 * * 1', async () => {
        try {
            await scheduleService.cleanExpiredSchedules();
        } catch (error) {
            console.error('Failed to clean expired schedules:', error);
        }
    }, {
        timezone: "Asia/Seoul" 
    });
};

module.exports = {
    initScheduleCleaner
};