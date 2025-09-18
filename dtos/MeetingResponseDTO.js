// dtos/MeetingDetailResponseDTO.js


class MeetingResponseDTO {
  constructor(meeting, isParticipant, isScheduleConflict, isOwner) {
      this.id = meeting.id;
      this.title = meeting.title;
      this.description = meeting.description;
      this.timeIdxStart = meeting.time_idx_start; 
      this.timeIdxEnd = meeting.time_idx_end;     
      this.location = meeting.location;
      this.time_idx_deadline = meeting.time_idx_deadline;
      this.type = meeting.type;
      this.creatorName = creatorName;
      this.isOwner = isOwner;
      this.isParticipant = isParticipant;
      this.isScheduleConflict = isScheduleConflict;
  }
}

module.exports = MeetingResponseDTO;