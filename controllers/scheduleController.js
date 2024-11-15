const ScheduleService = require('../services/scheduleService');

class scheduleController {
    /**
     * 스케줄 생성
     * POST /api/schedules
     * 해당 사용자 id는 auth 미들웨어에서 설정된 사용자 정보 이용
     * req.user = User 모델의 인스턴스
     */
    async createSchedule(req, res) {
        try {
            const userId = req.user.id;
            const { title, start_time, end_time, is_fixed } = req.body;

            const schedule = await ScheduleService.createSchedule({
                userId,
                title,
                start_time,
                end_time,
                is_fixed
            });

            return res.status(201).json({
                success: true,
                data: {
                    schedule
                }
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'SCHEDULE_CREATE_ERROR'
                }
            });
        }
    }
}