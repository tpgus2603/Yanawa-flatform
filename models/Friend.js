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
});

Friend.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Friend.belongsTo(User, { foreignKey: 'friend_id', as: 'friend' });

User.hasMany(Friend, { foreignKey: 'user_id', as: 'friends' });
User.hasMany(Friend, { foreignKey: 'friend_id', as: 'friendRequests' });

module.exports = Friend;