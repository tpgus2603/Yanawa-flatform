const express = require('express');
const passport = require('passport');

const router = express.Router();

// GET api/auth/login
router.get('/login', (req, res, next) => {
  // 프론트엔드에서 전달한 redirectUrl 가져오기
  const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL || 'https://yanawa.shop';
	  // redirectUrl 유효성 검증

  // redirectUrl 세션에 저장
  req.session.redirectUrl = redirectUrl;

  // Google OAuth 인증 시작
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    const redirectUrl = req.session.redirectUrl || 'https://yanawa.shop';


    req.session.redirectUrl = null;

    req.session.save((err) => {
      if (err) {
        console.error('세션 저장 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
      }

      res.redirect(redirectUrl);
    });
  }
);

module.exports = router;
