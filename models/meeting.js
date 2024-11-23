// models/Meeting.js
const { DataTypes } = require('sequelize');
const sequelize  = require('../config/sequelize');
const User = require('./user');

const Meeting = sequelize.define('Meeting', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  time_idx_start: { 
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  time_idx_end: { 
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
  },
  time_idx_deadline: {
    type: DataTypes.INTEGER,
  },
  type: {
    type: DataTypes.ENUM('OPEN', 'CLOSE'),
    allowNull: false,
  },
}, {
  tableName: 'Meetings',
  timestamps: false,
});

module.exports = Meeting;
