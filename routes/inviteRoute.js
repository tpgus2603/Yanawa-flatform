// routes/inviteRoutes.js
const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const { isLoggedIn } = require('../middlewares/auth');


router.use(isLoggedIn);
// 초대 응답
router.post('/respond', async (req, res) => {
    const { inviteId, response } = req.body;
    const userId = req.user.id; // 인증된 사용자 ID
    try {
        const result = await inviteController.respondToInvite(inviteId, userId, response);
        res.status(200).json({ success: true, result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// 받은 초대 조회
router.get('/received', async (req, res) => {
    const userId = req.user.id; // 인증된 사용자 ID
    try {
        const invites = await inviteController.getReceivedInvites(userId);
        res.status(200).json({ success: true, invites });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
