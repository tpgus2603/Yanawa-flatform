// middlewares/auth.js
exports.isLoggedIn = (req, res, next) => { // 로그인된 사용자만 접근 허용
  if (req.isAuthenticated()) {
    return next();
  }
  // 리다이렉트 대신 401 Unauthorized 상태 반환
  res.status(401).json({ error: '로그인 되지않은 사용자' });
};

exports.isNotLoggedIn = (req, res, next) => { // 로그인 안된 사용자만 접근 허용
  if (!req.isAuthenticated()) {
    return next();
  }
  // 리다이렉트 대신 400 Bad Request 상태 반환 (필요에 따라 변경 가능)
  res.status(400).json({ error: '이미 로그인된' });
};