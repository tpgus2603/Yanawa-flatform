const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/auth');
const FriendController = require('../controllers/friendController');

router.use(isLoggedIn);

/**
 * 친구 요청 보내기
 * POST /api/friend/request
 */
router.post('/request', FriendController.sendRequest);

/**
 * 받은 친구 요청 목록 조회
 * GET /api/friend/requests/received
 */
router.get('/requests/received', FriendController.getReceivedRequests);

/**
 * 보낸 친구 요청 목록 조회
 * GET /api/friend/requests/sent
 */
router.get('/requests/sent', FriendController.getSentRequests);

/**
 * 친구 요청 수락
 * POST /api/friend/request/:requestId/accept
 */
router.post('/request/:requestId/accept', FriendController.acceptRequest);

/**
 * 친구 요청 거절
 * POST /api/friend/request/:requestId/reject
 */
router.post('/request/:requestId/reject', FriendController.rejectRequest);

/**
 * 친구 목록 조회
 * GET /api/friend/all
 */
router.get('/all', FriendController.getFriendList);

/**
 * 친구 삭제
 * DELETE /api/friend/:friendId
 */
router.delete('/:friendId', FriendController.deleteFriend);

module.exports = router;