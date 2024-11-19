const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/create-room', chatController.createChatRoom);
router.get('/rooms', chatController.getChatRooms);
router.post('/update-status', chatController.updateStatus);
router.post('/update-read-status', chatController.updateReadStatus);
router.get('/unread-messages/:nickname', chatController.getUnreadMessages);
router.get('/unread-count/:chatRoomId', chatController.getUnreadCount);
router.post('/update-status-and-logid', chatController.updateStatusAndLogId);
router.post('/update-read-log-id', chatController.updateReadLogId);

module.exports = router;
