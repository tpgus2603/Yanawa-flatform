const express = require('express');
const router = express.Router();

// GET /api/session/info
router.get('/info', (req, res) => {
  if (req.session && req.session.user) {
    const { email, name } = req.session.user;

    return res.status(200).json({
      user: {
        email,
        name,
      },
    });
  }

  // 세션이 만료되었거나 사용자 정보가 없는 경우
  res.status(401).json({
    message: '세션이 만료되었거나 사용자 정보가 없습니다.',
  });
});

module.exports = router;
