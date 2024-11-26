const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const MeetingParticipant = sequelize.define(
  'MeetingParticipant',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    meeting_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'MeetingParticipants', // 테이블 이름 설정
    timestamps: false, // createdAt, updatedAt 필드 비활성화
  }
);

module.exports = MeetingParticipant;
