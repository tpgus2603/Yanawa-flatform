// models/Friend.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const Friend = sequelize.define('Friend', {
  type: {
    type: DataTypes.ENUM('NORMAL', 'SPECIAL'),
    allowNull: false,
  },
}, {
  tableName: 'Friends',
  timestamps: false,
});

Friend.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Friend.belongsTo(User, { foreignKey: 'friend_id', as: 'friend' });

User.hasMany(Friend, { foreignKey: 'user_id', as: 'friends' });
User.hasMany(Friend, { foreignKey: 'friend_id', as: 'friendOf' });

module.exports = Friend;
