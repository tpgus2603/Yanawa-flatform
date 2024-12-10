// dtos/MeetingResponseDTO.js
class MeetingDetailResponseDTO {
  constructor(meeting, isScheduleConflict) {
      this.id = meeting.id;
      this.title = meeting.title;
      this.description = meeting.description;
      this.timeIdxStart = meeting.time_idx_start; 
      this.timeIdxEnd = meeting.time_idx_end;     
      this.location = meeting.location;
      this.time_idx_deadline = meeting.time_idx_deadline;
      this.type = meeting.type;
      this.creatorName = meeting.creator ? meeting.creator.name : 'Unknown';
      this.isScheduleConflict = isScheduleConflict; 
      this.participants = meeting.participants.map(participant => ({
          userId: participant.user_id,
          name: participant.user  ? participant.user.name : 'Unknown',
          email: participant.user  ? participant.user.email : 'Unknown'
      }));
  }
}

module.exports = MeetingDetailResponseDTO;