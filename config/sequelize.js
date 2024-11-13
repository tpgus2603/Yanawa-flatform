// config/sequelize.js

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql', // 사용하려는 DBMS에 맞게 변경
  logging: false,
  define: {
    //timestamps: true, // createdAt, updatedAt 자동 생성
    underscored: true, // created_at 형식의 필드명 사용
  },
});

module.exports = sequelize;