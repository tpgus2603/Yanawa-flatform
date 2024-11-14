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
}, {
  tableName: 'Schedules',
  timestamps: false,
});

Schedule.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Schedule, { foreignKey: 'user_id', as: 'schedules' });

module.exports = Schedule;
