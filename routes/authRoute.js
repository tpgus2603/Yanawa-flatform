const express = require('express');
const passport = require('passport');
const MemberService = require('../services/memberService');

const router = express.Router();

// Google OAuth 로그인 라우터
router.get(
  '/login',
  (req, res, next) => {
    const { state } = req.query; // 클라이언트에서 전달된 state(fcmToken)
    console.log("State received at /login:", state);

    passport.authenticate("google", {
      scope: ["profile", "email"], // 요청할 사용자 정보
      state, // 전달받은 fcmToken을 state로 설정
    })(req, res, next);
  }
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONT_URL}/login`
  }),
  async (req, res) => {
    // Google OAuth 인증 성공 후 state 파라미터로 전달된 fcmToken 가져오기
    const fcmToken = req.query.state;
    console.log("받아온 fcmToken", fcmToken);
    const userEmail = req.user.email; // Google 로그인에서 가져온 email
    const redirectUrl = process.env.FRONT_URL;
    req.session.userEmail = userEmail; // 세션에 사용자 이메일 저장

    try {
      if (fcmToken) {
        // FCM 토큰 등록
        await MemberService.registerToken(userEmail, fcmToken);
        console.log(`FCM token registered for user: ${userEmail}`);
      } else {
        console.warn("No FCM token provided during login");
      }
    } catch (error) {
      console.error("Error registering FCM token during login:", error);
    }

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

// 사용자 삭제 라우터
router.delete('/leave', async (req, res) => {
  try {
    // 인증된 사용자 확인
    if (!req.user) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    const userId = req.user.id;

    // 사용자 삭제
    const deleted = await User.destroy({
      where: { id: userId }
    });

    if (!deleted) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 세션 삭제
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 삭제 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
      }
      // 성공 메시지 반환 (리다이렉트 대신 JSON 응답)
      res.status(200).json({ message: '사용자 계정이 성공적으로 삭제되었습니다.' });
    });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;