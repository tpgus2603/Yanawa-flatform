// dtos/MeetingDetailResponseDTO.js

class MeetingDetailResponseDTO {
  constructor(meeting) {
      this.id = meeting.id;
      this.title = meeting.title;
      this.description = meeting.description;
      this.startTime = meeting.start_time;
      this.endTime = meeting.end_time;
      this.location = meeting.location;
      this.deadline = meeting.deadline;
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
