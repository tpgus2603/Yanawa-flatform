// models/MeetingParticipant.js

const { DataTypes } = require('sequelize');
const sequelize  = require('../config/sequelize');
const Meeting =require('./Meeting');
const User = require('./user');


const MeetingParticipant = sequelize.define('MeetingParticipant', {
  tableName: 'MeetingParticipants',
  timestamps: false,
});


module.exports = MeetingParticipant;
