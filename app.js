<<<<<<< Updated upstream
=======
// app.js

require('dotenv').config();

>>>>>>> Stashed changes
const express = require('express');
const session = require('express-session');
const passport = require('./passport'); // 변경된 경로
const flash = require('connect-flash');

const app = express();
<<<<<<< Updated upstream
=======

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 세션 설정
app.use(
  session({
    secret: 'your_session_secret', 
    resave: false,
    saveUninitialized: false,
  })
);

// Passport 초기화 및 세션 연결
app.use(passport.initialize());
app.use(passport.session());

// 플래시 메시지 (선택 사항)
app.use(flash());

// 라우트 설정
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// ... 다른 라우트 및 설정

// 서버 시작
>>>>>>> Stashed changes
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});