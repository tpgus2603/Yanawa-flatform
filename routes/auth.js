// routes/auth.js
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
    res.redirect(process.env.FRONTEND_URL);
  });
});

// GET /auth/google
router.get('/google', (req, res, next) => {
  const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL;

  // 리다이렉트 URL 검증
  const allowedDomains = [process.env.FRONTEND_URL];
  if (!allowedDomains.some((domain) => redirectUrl.startsWith(domain))) {
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
    const redirectUrl = req.session.redirectUrl || process.env.FRONTEND_URL;

    // 세션에서 redirectUrl 제거
    req.session.redirectUrl = null;
    res.redirect(redirectUrl);
  }
);

module.exports = router;
