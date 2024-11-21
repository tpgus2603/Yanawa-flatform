// models/Schedule.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const Schedule = sequelize.define('Schedule', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  is_fixed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Schedules',
  timestamps: true,  // created_at과 updated_at 자동 관리
});

// Schedule.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// User.hasMany(Schedule, { foreignKey: 'user_id', as: 'schedules' });

module.exports = Schedule;