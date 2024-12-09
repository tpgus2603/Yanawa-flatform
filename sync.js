// sync.js

const sequelize = require('./config/sequelize');
const model=require('./models'); // 모델들을 가져옴 (사이드 이펙트로 모델들이 등록됨)

async function syncRdb() {
  try {
    // 데이터베이스 연결 테스트
    await sequelize.authenticate();
    console.log('Rdb 데이터베이스 연결 성공.');

    await sequelize.sync();
    console.log('모든 모델이 성공적으로 동기화됨.');
  } catch (error) {
    console.error('Rdb 데이터베이스 연결 실패:', error);
  }
}



module.exports = syncRdb;