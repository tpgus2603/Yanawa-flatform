// dtos/MeetingResponseDTO.js
class MeetingDetailResponseDTO {
  constructor(meeting) {
      this.id = meeting.id;
      this.title = meeting.title;
      this.description = meeting.description;
      this.timeIdxStart = meeting.time_idx_start; 
      this.timeIdxEnd = meeting.time_idx_end;     
      this.location = meeting.location;
      this.time_idx_deadline = meeting.time_idx_deadline;
      this.type = meeting.type;
      this.creatorName = meeting.creator ? meeting.creator.name : 'Unknown';
      this.participants = meeting.participants.map(participant => ({
          userId: participant.user_id,
          name: participant.participantUser ? participant.participantUser.name : 'Unknown',
          email: participant.participantUser ? participant.participantUser.email : 'Unknown'
      }));
  }
}

module.exports = MeetingDetailResponseDTO;