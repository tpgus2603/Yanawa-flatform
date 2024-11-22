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
  deadline: {
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

// // 연관 관계 설정
// Meeting.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
// User.hasMany(Meeting, { foreignKey: 'created_by', as: 'meetings' });

// Meeting.belongsTo(ChatRoom, { foreignKey: 'chatRoomId', as: 'chatRoom' });
// ChatRoom.hasOne(Meeting, { foreignKey: 'chatRoomId', as: 'meeting' });

module.exports = Meeting;
