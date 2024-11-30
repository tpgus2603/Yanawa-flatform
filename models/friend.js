// models/friend.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user');

const Friend = sequelize.define('Friend', {
    status: {
        type: DataTypes.ENUM('PENDING', 'ACCEPTED'),
        allowNull: false,
        defaultValue: 'PENDING',
    }
}, {
    tableName: 'Friends',
    timestamps: true,
    underscored: true,
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

module.exports = Friend;
