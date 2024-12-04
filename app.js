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
const morgan = require('morgan');
const syncRdb = require('./sync'); // Import the syncDatabase function
const app = express();



app.use(morgan('dev'));  //로깅용
// CORS 설정

const corsOptions = {
  origin: (origin, callback) => {
    console.log('CORS Origin:', origin); // 디버깅용 로그
    const allowedOrigins = [
      'http://localhost:3000', // 로컬 개발 환경
      'http://ec2-43-203-68-83.ap-northeast-2.compute.amazonaws.com', // EC2 백엔드
    ];
    if (!origin) return callback(null, true); // origin이 없으면 허용 (e.g., Postman)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log('CORS origin rejected:', origin); // 차단된 origin 로그
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // 쿠키 허용
};

// CORS 미들웨어 적용
app.use(cors(corsOptions));

// Preflight 요청 처리
app.options('*', cors(corsOptions));


// 
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: true, 
      maxAge: 60 * 60 * 1000, // 1시간
      sameSite: 'none', 
    },
  })
);


// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Passport 초기화 및 세션 연결
app.use(passport.initialize());
app.use(passport.session());


app.use(flash());
console.log('MongoDB URI:', process.env.MONGO_URI);
//라우터 등록 
const authRoutes = require('./routes/auth');
app.use('/api/auth',authRoutes);

const scheduleRoutes = require('./routes/schedule');
app.use('/api/schedule', scheduleRoutes);

const friendRoutes = require('./routes/friend');
app.use('/api/friend', friendRoutes);

const meetingRoutes = require('./routes/meetingRoute');
app.use('/api/meeting', meetingRoutes);

const chatRoutes = require('./routes/chatRoute');
app.use('/api/chat', chatRoutes);

const memberRoutes = require('./routes/memberRoute');
app.use('/api/member', memberRoutes);

// 스케줄 클리너 초기화
initScheduleCleaner();

const PORT = process.env.PORT || 3000;

// MongoDB 및 MySQL 연결 후 서버 시작
(async () => {
  try {
    // MongoDB 연결
    await connectMongoDB();
    // MySQL 연결 확인
    await syncRdb();
    // 서버 시작
    app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 중 오류 발생:', error);
    process.exit(1);
  }
})();
