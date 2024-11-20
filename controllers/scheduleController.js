// controllers/scheduleController.js
const ScheduleService = require('../services/scheduleService');
const ScheduleRequestDTO = require('../dtos/ScheduleRequestDTO');

class scheduleController {
    /**
     * 스케줄 생성
     * POST /api/schedule
     */
    async createSchedule(req, res) {
        try {
            const userId = req.user.id;
            const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
            const validatedData = scheduleRequestDTO.validate('create');

            const scheduleDTO = await ScheduleService.createSchedule({
                userId,
                ...validatedData
            });

            return res.status(201).json({
                success: true,
                data: scheduleDTO
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    message: error.message.includes('Validation error') ? error.message : 'SCHEDULE_CREATE_ERROR',
                    code: error.message.includes('Validation error') ? 'VALIDATION_ERROR' : 'SCHEDULE_CREATE_ERROR'
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
            const userId = req.user.id;
            const scheduleRequestDTO = new ScheduleRequestDTO(req.body);
            const validatedData = scheduleRequestDTO.validate('update');

            const scheduleDTO = await ScheduleService.updateSchedule(id, userId, validatedData);

            return res.status(200).json({
                success: true,
                data: scheduleDTO
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
            } else if (error.message.includes('Validation error')) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: error.message,
                        code: 'VALIDATION_ERROR'
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

            const deleteResult = await ScheduleService.deleteSchedule(id, userId);

            return res.status(200).json({
                success: true,
                data: deleteResult
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
                    message: 'Failed to delete schedule',
                    code: 'DELETE_ERROR'
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
            const schedulesDTO = await ScheduleService.getAllSchedules(userId);

            return res.status(200).json({
                success: true,
                data: schedulesDTO
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
     * GET /api/schedule/:id
     */
    async getScheduleById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const scheduleDTO = await ScheduleService.getScheduleById(id, userId);

            return res.status(200).json({
                success: true,
                data: scheduleDTO
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
