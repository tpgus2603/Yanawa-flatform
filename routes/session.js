const express = require('express');
const router = express.Router();

// GET /api/session/info
router.get('/info', (req, res) => {
  if (req.user) {
    const { email, name } = req.user;
  // 캐싱 비활성화
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');	  
    return res.status(200).json({
      user: {
        email,
        name,
      },
    });
  }
  // 세션이 만료되었거나 사용자 정보가 없는 경우
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.status(401).json({
    message: '세션이 만료되었거나 사용자 정보가 없습니다.',
  });
});

module.exports = router;
