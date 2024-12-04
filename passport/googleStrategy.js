// passport/googleStrategy.js
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/user'); // 사용자 모델을 가져옵니다.

module.exports = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // 프로필에서 사용자 정보 추출
      const email = profile.emails[0].value;
      const name = profile.displayName;

      // 데이터베이스에서 사용자 찾거나 생성
      let user = await User.findOne({ where: { email } });
      if (!user) {
        user = await User.create({ email, name });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
);
