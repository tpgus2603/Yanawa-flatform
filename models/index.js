// models/index.js

const sequelize = require('../config/sequelize');

const User = require('./User');
const Schedule = require('./Schedule');
const Meeting = require('./Meeting');
const MeetingParticipant = require('./MeetingParticipant'); //폴더명수정 
const Friend = require('./Friend');
const FcmToken = require('./fcmToken');

module.exports = {
  sequelize,
  User,
  Schedule,
  Meeting,
  MeetingParticipant,
  Friend,
  FcmToken, 
};
