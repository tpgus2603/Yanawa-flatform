// app.js

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('./passport'); 
const flash = require('connect-flash');
const { initScheduleCleaner } = require('./utils/scheduler');
const connectMongoDB = require('./config/mongoose'); // MongoDB 연결
const { sequelize } = require('./config/sequelize'); // Sequelize 연결
const cors = require('cors');

const app = express();

// CORS 설정
app.use(
  cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);


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


app.use(flash());

//라우터 등록 
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const scheduleRoutes = require('./routes/schedule');
app.use('/api/schedule', scheduleRoutes);

const friendRoutes = require('./routes/friend');
app.use('/api/friend', friendRoutes);

const meetingRoutes = require('./routes/meetingRoute');
app.use('/api/meeting', meetingRoutes);

//const chatRoutes = require('./routes/chatRoute');
app.use('/api/chat', chatRoutes);

// 스케줄 클리너 초기화
initScheduleCleaner();

const PORT = process.env.PORT || 3000;

// MongoDB 및 MySQL 연결 후 서버 시작
(async () => {
  try {
    // MongoDB 연결
    await connectMongoDB();
    //console.log('✅ MongoDB 연결 성공');

    // MySQL 연결 확인
    await sequelize.authenticate();
    //console.log('✅ MySQL 연결 성공');

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 중 오류 발생:', error);
    process.exit(1);
  }
})();