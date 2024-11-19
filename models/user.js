// models/User.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize'); // sequelize 인스턴스 경로에 맞게 수정하세요.

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING, // VARCHAR
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING, // VARCHAR
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
}, {
  tableName: 'Users',
  timestamps: true, // createdAt과 updatedAt 자동 관리
});

module.exports = User;
