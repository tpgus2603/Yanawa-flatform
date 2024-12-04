// dtos/ScheduleResponseDTO.js

class ScheduleResponseDTO {
  static groupSchedules(schedules) {
      const grouped = schedules.reduce((acc, schedule) => {
          const key = `${schedule.title}-${schedule.is_fixed}`;
          if (!acc[key]) {
              acc[key] = {
                  id: schedule.id,
                  user_id: schedule.user_id,
                  title: schedule.title,
                  is_fixed: schedule.is_fixed,
                  time_indices: [],
                  createdAt: schedule.createdAt,
                  updatedAt: schedule.updatedAt
              };
          }
          acc[key].time_indices.push(schedule.time_idx);
          return acc;
      }, {});

      return Object.values(grouped);
  }
}

module.exports = ScheduleResponseDTO;
