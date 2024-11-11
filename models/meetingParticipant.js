// models/MeetingParticipant.js
module.exports = (sequelize, DataTypes) => {
  const MeetingParticipant = sequelize.define('MeetingParticipant', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    meeting_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'Meetings',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  }, {
    tableName: 'MeetingParticipants',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['meeting_id', 'user_id'],
      },
    ],
  });

  return MeetingParticipant;
};
