// middlewares/auth.js

exports.isLoggedIn = (req, res, next) => { //로그인된 사용자자만 접근허용
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
};

exports.isNotLoggedIn = (req, res, next) => { //로그인 안되면 리다이렉트 
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};
