// models/meeting.js
const {DataTypes} = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user');

const Meeting = sequelize.define('Meeting', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    time_idx_start: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    time_idx_end: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    location: {
        type: DataTypes.STRING,
    },
    time_idx_deadline: {
        type: DataTypes.INTEGER,
        defaultValue: 671,
    },
    type: {
        type: DataTypes.ENUM('OPEN', 'CLOSE'),
        allowNull: false,
        defaultValue: 'OPEN',
    },
    chatRoomId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    max_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20, // 기본값 설정 (필요에 따라 조정)
    },
    cur_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 생성자 자신 포함
    },
}, {
    tableName: 'Meetings',
    timestamps: true,
    underscored: true,
});

module.exports = Meeting;
