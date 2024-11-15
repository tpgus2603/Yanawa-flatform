const { success } = require('../passport/googleStrategy');
const ScheduleService = require('../services/scheduleService');

class scheduleController {
    /**
     * 스케줄 생성
     * POST /api/schedule
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

    /**
     * 스케줄 수정
     * PUT /api/schedule/:id
     */
    async updateSchedule(req, res) {
        try {
            const { id } = req.params;
            const { title, start_time, end_time } = req.body;

            const userId = req.user.id;
            const schedule = await ScheduleService.updateSchedule(id, userId, 
                {
                    title,
                    start_time,
                    end_time
                });
            
            return res.statu(200).json({
                success: true,
                data: schedule
            });
        } catch (error) {
            if (error.message === 'Schedule not found') {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: error.message,
                        code: 'SCHEDULE_NOT_FOUND'
                    }
                });
            }
            return res.status(400).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'SCHEDULE_UPDATE_ERROR'
                }
            });
        }
    }

    /**
     * 스케줄 삭제
     * DELETE /api/schedule/:id
     */
    async deleteSchedule(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            await ScheduleService.deleteSchedule(id, userId);

            return res.status(200).json({
                success: true,
                data: {
                    message: 'Schedule successfully deleted'
                }
            });
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'SCHEDULE_NOT_FOUND'
                }
            });
        }
    }

    
}