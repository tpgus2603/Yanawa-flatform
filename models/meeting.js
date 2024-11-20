// models/Meeting.js

const { DataTypes } = require('sequelize');
const sequelize  = require('../config/sequelize');
const User = require('./User');

const Meeting = sequelize.define('Meeting', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
  },
  deadline: {
    type: DataTypes.DATE,
  },
  type: {
    type: DataTypes.ENUM('OPEN', 'CLOSE'),
    allowNull: false,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  chatRoomId: { // 새로운 필드 추가
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'Meetings',
  timestamps: false,
});


// 연관 관계 설정
Meeting.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Meeting, { foreignKey: 'created_by', as: 'meetings' });

module.exports = Meeting;

