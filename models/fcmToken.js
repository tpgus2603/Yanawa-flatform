const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User'); // 올바른 경로 확인

const FcmToken = sequelize.define('FcmToken', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User, // 문자열 대신 모델 객체를 참조
      key: 'id',
    },
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'FcmTokens',
  timestamps: true,
});

// 관계 설정
FcmToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(FcmToken, { foreignKey: 'userId', as: 'fcmTokenList' });



module.exports = FcmToken;