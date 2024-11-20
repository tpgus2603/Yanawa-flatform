// dtos/ScheduleResponseDTO.js

class ScheduleResponseDTO {
  constructor(schedule) {
      this.id = schedule.id;
      this.user_id = schedule.user_id; 
      this.title = schedule.title;
      this.start_time = schedule.start_time;
      this.end_time = schedule.end_time;
      this.is_fixed = schedule.is_fixed;
      this.expiry_date = schedule.expiry_date;
      this.createdAt = schedule.createdAt;
      this.updatedAt = schedule.updatedAt;
  }
}

module.exports = ScheduleResponseDTO;
