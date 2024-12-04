const express = require('express');
const passport = require('passport');

const router = express.Router();

// GET api/auth/login
router.get('/login', (req, res, next) => {
  // 프론트엔드에서 전달한 redirectUrl 가져오기
  const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:3000';

  // redirectUrl 유효성 검증
  const allowedDomains = [process.env.FRONTEND_URL || 'http://localhost:3000'];
  if (!allowedDomains.some((domain) => redirectUrl.startsWith(domain))) {
    return res.status(400).json({ error: 'Invalid redirect URL' });
  }

  // redirectUrl 세션에 저장
  req.session.redirectUrl = redirectUrl;

  // Google OAuth 인증 시작
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    // 세션에서 redirectUrl 가져오기
    const redirectUrl = req.session.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:3000';

    // 세션에서 redirectUrl 제거
    req.session.redirectUrl = null;

    // 인증 완료 후 프론트엔드로 리다이렉트
    res.redirect(redirectUrl);
  }
);

module.exports = router;
