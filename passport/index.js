// passport/index.js

const passport = require('passport');
const User = require('../models/User');

// 직렬화
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 역직렬화
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// 전략 가져오기
const googleStrategy = require('./googleStrategy');
passport.use(googleStrategy);

module.exports = passport;
