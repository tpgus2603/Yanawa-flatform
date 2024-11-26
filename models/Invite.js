// models/Invite.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');
const Meeting = require('./Meeting');

const Invite = sequelize.define('Invite', {
    status: {
        type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'DECLINED'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
}, {
    tableName: 'Invites',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['meeting_id', 'invitee_id']
        },
        {
            fields: ['status']
        }
    ]
});

// 관계 설정
// Invite.belongsTo(Meeting, { foreignKey: 'meeting_id', as: 'meeting' });
// Invite.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' }); // 초대한 사용자
// Invite.belongsTo(User, { foreignKey: 'invitee_id', as: 'invitee' }); // 초대받은 사용자

// User.hasMany(Invite, { foreignKey: 'inviter_id', as: 'sentInvites' }); // 보낸 초대 목록
// User.hasMany(Invite, { foreignKey: 'invitee_id', as: 'receivedInvites' }); // 받은 초대 목록
// Meeting.hasMany(Invite, { foreignKey: 'meeting_id', as: 'invites' }); // 해당 미팅의 모든 초대

module.exports = Invite;