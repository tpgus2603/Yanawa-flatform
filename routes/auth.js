const express = require('express');
const passport = require('passport');

const router = express.Router();

// Google OAuth 로그인 라우터
router.get(
  '/login',
  passport.authenticate('google', {
    scope: ['profile', 'email'], // 사용자 정보 요청을 위한 scope 
    failureRedirect: `${process.env.FRONT_URL}/login`
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONT_URL}/login` // 수정된 부분
  }),
  (req, res) => {
    const redirectUrl = process.env.FRONT_URL;
    req.session.save((err) => {
      if (err) {
        console.error('세션 저장 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
      }
      res.redirect(redirectUrl);
    });
  }
);

// 로그아웃 라우터
router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 삭제 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
      }
      const redirectUrl = process.env.FRONT_URL;
      res.redirect(redirectUrl);
    });
  } else {
    // 세션이 없는 경우에도 리다이렉트
    const redirectUrl = process.env.FRONT_URL;
    res.redirect(redirectUrl);
  }
});

module.exports = router;