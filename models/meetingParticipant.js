// models/MeetingParticipant.js

const { DataTypes } = require('sequelize');
const sequelize  = require('../config/sequelize');
const Meeting =require('./Meeting');
const User = require('./User');


const MeetingParticipant = sequelize.define('MeetingParticipant', {
  meeting_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'MeetingParticipants',
  timestamps: false,
});

// MeetingParticipant.belongsTo(Meeting, { foreignKey: 'meeting_id', as: 'meeting' });
// Meeting.hasMany(MeetingParticipant, { foreignKey: 'meeting_id', as: 'participants' });

// MeetingParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// User.hasMany(MeetingParticipant, { foreignKey: 'user_id', as: 'meetingParticipations' });


module.exports = MeetingParticipant;
