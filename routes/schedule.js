const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/auth');
const ScheduleController = require('../controllers/scheduleController');

/**
 * 스케줄 API 라우트
 * 기본 경로: /api/schedule -> app.js에서 등록
 * isLoggedIn 미들웨어 사용해서 인증 체크
 */
router.use(isLoggedIn);

/**
 * 전체 스케줄 조회
 * GET /api/schedule/all
 */
router.get('/all', ScheduleController.getAllSchedules);

/**
 * 개별 스케줄 조회
 * Get /api/schedule/:id
 */
router.get('/:id', ScheduleController.getScheduleById);

/**
 * 스케줄 생성
 * POST /api/schedule
 */
router.post('/', ScheduleController.createSchedule);

/**
 * 스케줄 수정
 * PUT /api/schedule/:id
 */
router.put('/:id', ScheduleController.updateSchedule);

/**
 * 스케줄 삭제
 * DELETE /api/schedule/:id
 */
router.delete('/:id', ScheduleController.deleteSchedule);


module.exports = router;