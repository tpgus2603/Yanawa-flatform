// routes/meetingRoutes.js

const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/auth');
const MeetingController = require('../controllers/meetingController');

router.use(isLoggedIn);

// 내가 참여한 모임 목록 조회
router.get('/my', MeetingController.getMyMeetings);

// 번개 모임 생성
router.post('/', MeetingController.createMeeting);

// 번개 모임 목록 조회
router.get('/', MeetingController.getMeetings);

// 번개 모임 마감
router.put('/:meetingId/close', MeetingController.closeMeeting);

// 번개 모임 참가
router.post('/:meetingId/join', MeetingController.joinMeeting);

// 번개 모임 상세 조회
router.get('/:meetingId', MeetingController.getMeetingDetail);

// 번개 모임 탈퇴
router.delete('/:meetingId/leave', MeetingController.leaveMeeting);

// 번개 모임 삭제
router.delete('/:meetingId', MeetingController.deleteMeeting);

module.exports = router;