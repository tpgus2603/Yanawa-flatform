// models/MeetingParticipant.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const MeetingParticipant = sequelize.define('MeetingParticipant', {
  meeting_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  }
}, {
  tableName: 'MeetingParticipants',
  timestamps: false,
});

MeetingParticipant.associate = (models) => {
  MeetingParticipant.belongsTo(models.Meeting, {
    foreignKey: 'meeting_id',
    as: 'meeting'
  });

  MeetingParticipant.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'participantUser'
  });
};

module.exports = MeetingParticipant;
