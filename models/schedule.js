// models/Schedule.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user');

const Schedule = sequelize.define('Schedule', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  time_idx: { // 일주일을 15분 단위로 나눈 시간 인덱스
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 671, // 7일 * 24시간 * 4 (15분 단위) - 1
    },
  },
  is_fixed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'Schedules',
  timestamps: true, // createdAt과 updatedAt 자동 관리
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'time_idx'],
      name: 'unique_schedule_per_user_time',
    },
    {
      fields: ['time_idx'],
    },
  ],
});


module.exports = Schedule;
