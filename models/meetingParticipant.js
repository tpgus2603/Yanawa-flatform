// models/MeetingParticipant.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Meeting = require('./Meeting');
const User = require('./User');

const MeetingParticipant = sequelize.define('MeetingParticipant', {}, {
  tableName: 'MeetingParticipants',
  timestamps: true,
});

MeetingParticipant.belongsTo(Meeting, { foreignKey: 'meeting_id', as: 'meeting' });
Meeting.hasMany(MeetingParticipant, { foreignKey: 'meeting_id', as: 'participants' });

MeetingParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(MeetingParticipant, { foreignKey: 'user_id', as: 'meetingParticipations' });

module.exports = MeetingParticipant;
