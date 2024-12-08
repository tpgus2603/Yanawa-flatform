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
      failureRedirect: `${process.env.FRONT_URL}/login` 
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