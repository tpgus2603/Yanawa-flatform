const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isLoggedIn } = require('../middlewares/auth');

router.post('/create-room', chatController.createChatRoom);
router.post('/update-status', chatController.updateStatus);
router.post('/update-read-status', chatController.updateReadStatus);
router.get('/unread-messages/:nickname', chatController.getUnreadMessages);
router.get('/unread-count/:chatRoomId', chatController.getUnreadCount);
router.post('/update-status-and-logid', chatController.updateStatusAndLogId);
router.post('/update-read-log-id', chatController.updateReadLogId);

router.use(isLoggedIn);
router.get('/rooms', chatController.getChatRooms);

router.post('/:chatRoomId/notices', chatController.addNotice); 
router.get('/:chatRoomId/notices/latest', chatController.getLatestNotice); 
router.get('/:chatRoomId/notices', chatController.getAllNotices);
router.get('/:chatRoomId/notices/:noticeId', chatController.getNoticeById);

module.exports = router;
