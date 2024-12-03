// models/invite.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user');
const Meeting = require('./meeting');

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



module.exports = Invite;