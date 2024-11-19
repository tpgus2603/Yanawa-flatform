// models/Meeting.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const User = require('./User');

const Meeting = sequelize.define('Meeting', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
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
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
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
Meeting.associate = (models) => {
  Meeting.belongsTo(models.User, {
    foreignKey: 'created_by', // FK 설정
    as: 'creator', // 별칭
  });
  Meeting.hasMany(models.MeetingParticipant, {
    foreignKey: 'meeting_id',
    as: 'participants',
  });
};

module.exports = Meeting;