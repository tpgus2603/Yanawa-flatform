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
  req.logout(() => {
    res.redirect('/');
  });
});

// GET /auth/google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// GET /auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

module.exports = router;
