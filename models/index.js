// models/index.js

const sequelize = require('../config/sequelize');

const User = require('./User');
const Schedule = require('./Schedule');
const Meeting = require('./Meeting');
const MeetingParticipant = require('./MeetingParticipant');
const Friend = require('./Friend');

module.exports = {
  sequelize,
  User,
  Schedule,
  Meeting,
  MeetingParticipant,
  Friend,
};
