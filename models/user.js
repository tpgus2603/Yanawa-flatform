// models/User.js

const { DataTypes } = require('sequelize');
const sequelize  = require('../config/sequelize');

const User = sequelize.define('User', {
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

module.exports = User;
