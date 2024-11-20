// dtos/MeetingResponseDTO.js

class MeetingResponseDTO {
  constructor(meeting, isParticipant, isScheduleConflict, creatorName) {
      this.id = meeting.id;
      this.title = meeting.title;
      this.description = meeting.description;
      this.startTime = meeting.start_time;
      this.endTime = meeting.end_time;
      this.location = meeting.location;
      this.deadline = meeting.deadline;
      this.type = meeting.type;
      this.creatorName = creatorName;
      this.isParticipant = isParticipant;
      this.isScheduleConflict = isScheduleConflict;
  }
}

module.exports = MeetingResponseDTO;
