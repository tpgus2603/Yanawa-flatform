// app.js

require('dotenv').config(); // 환경 변수 로드

const express = require('express');
const app = express();
const sequelize = require('./config/sequelize');
//const mongoose = require('./config/mongoose');
//const userRoutes = require('./routes/userRoutes');
//const passport = require('./passport');

// 미들웨어 설정
app.use(express.json());
//app.use(passport.initialize());

// 라우팅
//app.use('/users', userRoutes);

// Sequelize 데이터베이스 연결 및 동기화
sequelize.sync()
  .then(() => {
    console.log('Sequelize synchronized.');
  })
  .catch(err => {
    console.error('Sequelize synchronization error:', err);
  });

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
