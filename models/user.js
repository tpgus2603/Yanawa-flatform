// models/User.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize'); 

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT, // 수정: id 필드를 BIGINT로 설정
    autoIncrement: true,
    primaryKey: true,
  },
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

User.associate = (models) => {
  User.hasMany(models.Meeting, {
    foreignKey: 'created_by', 
    as: 'createdMeetings', 
  });

  User.hasMany(models.MeetingParticipant, {
    foreignKey: 'user_id',
    as: 'userMeetingParticipations', 
  });
};  


module.exports = User;
