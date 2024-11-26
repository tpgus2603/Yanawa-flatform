// dtos/ScheduleResponseDTO.js

class ScheduleResponseDTO {
  constructor(schedule) {
      this.id = schedule.id;
      this.user_id = schedule.user_id;
      this.title = schedule.title;
      this.time_idx = schedule.time_idx; // 새로운 time_idx 필드 추가
      this.is_fixed = schedule.is_fixed;
      this.createdAt = schedule.createdAt;
      this.updatedAt = schedule.updatedAt;
  }
}

module.exports = ScheduleResponseDTO;
