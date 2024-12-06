const express = require('express');
const passport = require('passport');

const router = express.Router();

// GET api/auth/login
router.get('/login', (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
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
// GET api/auth/logout
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
