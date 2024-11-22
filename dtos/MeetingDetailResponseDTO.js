// dtos/MeetingResponseDTO.js

class MeetingResponseDTO {
  constructor(meeting, isParticipant, isScheduleConflict, creatorName) {
      this.id = meeting.id;
      this.title = meeting.title;
      this.description = meeting.description;
      this.timeIdxStart = meeting.time_idx_start; // 변경된 필드
      this.timeIdxEnd = meeting.time_idx_end;     // 변경된 필드
      this.location = meeting.location;
      this.deadline = meeting.deadline;
      this.type = meeting.type;
      this.creatorName = creatorName;
      this.isParticipant = isParticipant;
      this.isScheduleConflict = isScheduleConflict;
  }
}

module.exports = MeetingResponseDTO;
