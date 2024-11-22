// controllers/scheduleController.js
const ScheduleService = require('../services/scheduleService');
const ScheduleRequestDTO = require('../dtos/ScheduleRequestDTO');

class scheduleController {
    /**
     * 스케줄 생성
     * POST /api/schedule
     * 해당 사용자 id는 auth 미들웨어에서 설정된 사용자 정보 이용
     * req.user = User 모델의 인스턴스
     * 요청 본문 예시:
     * {
     *   title: 'Schedule Title',
     *   is_fixed: true,
     *   events: [
     *     { time_idx: 36 },
     *     { time_idx: 37 },
     *     // ...
     *   ]
     * }
     */
    async createSchedule(req, res) {
        try {
            const userId = req.user.id;
            const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
            const validatedData = scheduleRequestDTO.validate('create'); // 'create' 타입 검증

            const { title, is_fixed, events } = validatedData;

            const schedules = await ScheduleService.createSchedules({
                userId,
                title,
                is_fixed,
                events
            });

            return res.status(201).json({
                success: true,
                data: {
                    schedules
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
     * PUT /api/schedule
     * Bulk update 지원
     * 요청 본문 예시:
     * {
     *   updates: [
     *     { time_idx: 36, title: 'New Title', is_fixed: true },
     *     { time_idx: 44, title: 'Another Title' },
     *     // ...
     *   ]
     * }
     */
    async updateSchedules(req, res) {
        try {
            const userId = req.user.id;
            const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
            const validatedData = scheduleRequestDTO.validate('bulk_update'); // 'bulk_update' 타입 검증

            const { updates } = validatedData;

            const updatedSchedules = await ScheduleService.updateSchedules(userId, updates);

            return res.status(200).json({
                success: true,
                data: {
                    schedules: updatedSchedules
                }
            });
        } catch (error) {
            if (error.code === 'SCHEDULE_NOT_FOUND') {
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
     * DELETE /api/schedule
     * Bulk delete 지원
     * 요청 본문 예시:
     * {
     *   time_idxs: [36, 44, ...]
     * }
     */
    async deleteSchedules(req, res) {
        try {
            const userId = req.user.id;
            const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
            const validatedData = scheduleRequestDTO.validate('bulk_delete'); // 'bulk_delete' 타입 검증

            const { time_idxs } = validatedData;

            const result = await ScheduleService.deleteSchedules(userId, time_idxs);

            return res.status(200).json({
                success: true,
                data: {
                    message: 'Schedules successfully deleted',
                    deleted_time_idxs: result.deleted_time_idxs
                }
            });
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'SCHEDULE_DELETE_ERROR'
                }
            });
        }
    }

    /**
     * 해당 사용자 전체 스케줄 조회
     * GET /api/schedule/all
     */
    async getAllSchedules(req, res) {
        try {
            const userId = req.user.id;
            const schedules = await ScheduleService.getAllSchedules(userId);

            return res.status(200).json({
                success: true,
                data: schedules
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch schedules',
                    code: 'FETCH_ERROR'
                }
            });
        }
    }

    /**
     * 해당 사용자 특정 스케줄 조회
     * GET /api/schedule/:time_idx
     * 예: GET /api/schedule/36
     */
    async getScheduleByTimeIdx(req, res) {
        try {
            const { time_idx } = req.params;
            const userId = req.user.id;

            const schedule = await ScheduleService.getScheduleByTimeIdx(userId, parseInt(time_idx, 10));

            return res.status(200).json({
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

            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch schedule',
                    code: 'FETCH_ERROR'
                }
            });
        }
    }
}

module.exports = new scheduleController();
