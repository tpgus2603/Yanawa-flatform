// sync.js

//require('dotenv').config(); // 환경 변수 로드

const sequelize = require('./config/sequelize');
const model=require('./models'); // 모델들을 가져옴 (사이드 이펙트로 모델들이 등록됨)

async function syncRdb() {
  try {
    // 데이터베이스 연결 테스트
    await sequelize.authenticate();
    console.log('Rdb데이터베이스 연결 성공.');

    // 모든 모델 동기화
    await sequelize.sync({ force: true });
    console.log('모든 모델이 성공적으로 동기화되었습니다.');

    // 연결 종료
    await sequelize.close();
    console.log('Rdb데이터베이스 연결이 종료되었습니다.');
  } catch (error) {
    console.error('Rdb데이터베이스 연결 실패:', error);
  }
}



module.exports = syncRdb;