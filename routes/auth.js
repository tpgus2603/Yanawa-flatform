const express = require('express');
const passport = require('passport');

const router = express.Router();

// GET /auth/login
router.get('/login', (req, res) => {
  res.send('<a href="/auth/google">Log in with Google</a>');
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000'); // 기본값 설정
  });
});

// GET /auth/google
router.get('/google', (req, res, next) => {
  // 기본 redirectUrl 설정
  const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:3000';

  // allowedDomains 배열 확인 및 기본값 설정
  const allowedDomains = [process.env.FRONTEND_URL || 'http://localhost:3000'];

  // redirectUrl 검증
  if (!allowedDomains.some((domain) => redirectUrl && redirectUrl.startsWith(domain))) {
    return res.status(400).json({ error: 'Invalid redirect URL' });
  }

  // 세션에 redirectUrl 저장
  req.session.redirectUrl = redirectUrl;

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

    // 프론트엔드로 리다이렉트
    res.redirect(redirectUrl);
  }
);

module.exports = router;
