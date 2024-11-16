
// app.js

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('./passport'); // 변경된 경로
const flash = require('connect-flash');
const { initScheduleCleaner } = require('./utils/scheduler'); // 유동 스케줄 자동 삭제 유틸

const app = express();


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

/**
 * 라우터 등록
 */
// 로그인 라우터
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Schedule 라우터
const scheduleRoutes = require('./routes/schedule');
app.use('/api/schedule', scheduleRoutes);

// Friend 라우터
const friendRoutes = require('./routes/friendRoutes');
app.use('/api/friends', friendRoutes);



initScheduleCleaner();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
