const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/memberController');

// FCM 토큰 저장
router.post('/register-token', MemberController.registerToken);

module.exports = router;