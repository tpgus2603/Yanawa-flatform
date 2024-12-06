// controllers/scheduleController.js
const ScheduleService = require('../services/scheduleService');
const ScheduleRequestDTO = require('../dtos/ScheduleRequestDTO');
const performanceMonitor = require('../utils/performanceMonitor');

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
            return await performanceMonitor.measureAsync('createSchedule', async () => {
                const userId = 49;
                // const userId = req.user.id;
                const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
                const validatedData = scheduleRequestDTO.validate('create');

                const schedule = await ScheduleService.createSchedules({
                    userId,
                    ...validatedData
                });

                return res.status(201).json({
                    success: true,
                    data: { schedule }
                });
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
     *  "originalTitle": "알고리즘 스터디", // 기존 스케줄의 제목
     *  "title": "알고리즘 스터디 2.0",     // 변경할 제목 (제목 변경 안할거면 기존 제목을 넣어야함 * -> title로 동일 스케줄을 찾아서)
     *   "is_fixed": true,  
     *   "time_indices": [36, 37, 38, 40]   // 변경할 time_indices 배열
     * }
     */
    async updateSchedules(req, res) {
        try {
            return await performanceMonitor.measureAsync('updateSchedules', async () => {
                // const userId = req.user.id;
                const userId = 49;
                const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
                const validatedData = scheduleRequestDTO.validate('bulk_update');

                const updatedSchedule = await ScheduleService.updateSchedules(userId, validatedData);

                return res.status(200).json({
                    success: true,
                    data: { schedule: updatedSchedule }
                });
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
     * DELETE /api/schedule
     * Bulk delete 지원
     * 요청 본문 예시:
     * {
     *  "title": "알고리즘 스터디"
     * }
     */
    async deleteSchedules(req, res) {
        try {
            return await performanceMonitor.measureAsync('deleteSchedules', async () => {
                // const userId = req.user.id;
                const userId = 49;

                const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
                const validatedData = scheduleRequestDTO.validate('bulk_delete');

                const result = await ScheduleService.deleteSchedules(userId, validatedData.title);

                return res.status(200).json({
                    success: true,
                    data: {
                        message: 'Schedule successfully deleted',
                        deletedCount: result.deletedCount
                    }
                });
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
            return await performanceMonitor.measureAsync('getAllSchedules', async () => {
                // const userId = req.user.id;
                const userId = 49;

                const schedules = await ScheduleService.getAllSchedules(userId);

                return res.status(200).json({
                    success: true,
                    data: { schedules }
                });
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
            return await performanceMonitor.measureAsync('getScheduleByTimeIdx', async () => {
                const { time_idx } = req.params;
                // const userId = req.user.id;
                const userId = 49;

                
                const scheduleRequestDTO = new ScheduleRequestDTO({ time_idx: parseInt(time_idx, 10) });
                const validatedData = scheduleRequestDTO.validate('get_by_time_idx');

                const schedule = await ScheduleService.getScheduleByTimeIdx(userId, validatedData.time_idx);

                return res.status(200).json({
                    success: true,
                    data: { schedule }
                });
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
