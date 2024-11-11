// models/Schedule.js
module.exports = (sequelize, DataTypes) => {
  const Schedule = sequelize.define('Schedule', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStart(value) {
          if (value <= this.start_time) {
            throw new Error('end_time은 start_time 이후여야 합니다.');
          }
        },
      },
    },
  }, {
    tableName: 'Schedules',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id'],
      },
    ],
  });

  return Schedule;
};
