// models/Friend.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const Friend = sequelize.define('Friend', {
    status: {
        type: DataTypes.ENUM('PENDING', 'ACCEPTED'),
        allowNull: false,
        defaultValue: 'PENDING'
    }
}, {
    tableName: 'Friends',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['requester_id', 'receiver_id']
        },
        {
            fields: ['status']
        }
    ]
});

// 관계 설정
Friend.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' }); // 친구 요청을 보낸 사용자
Friend.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });   // 친구 요청을 받은 사용자

User.hasMany(Friend, { foreignKey: 'requester_id', as: 'sentRequests' });     // 친구 요청을 보낸 목록
User.hasMany(Friend, { foreignKey: 'receiver_id', as: 'receivedRequests' }); // 친구 요청을 받은 목록

module.exports = Friend;
