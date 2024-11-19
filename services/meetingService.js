const { v4: uuidv4 } = require('uuid');
const { Meeting, MeetingParticipant, User } = require('../models');
const ChatRoom = require('../models/chatRooms');
const chatController = require('../controllers/chatController');
const MeetingResponse = require('../dtos/MeetingResponse');
const MeetingDetailResponse = require('../dtos/MeetingDetailResponse');

class MeetingService {
  async createMeeting(meetingData) {
    const { title, description, start_time, end_time, location, deadline, type, created_by } = meetingData;

    const user = await User.findOne({ where: { id: created_by } });
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const chatRoomData = {
      participants: [user.name],
    };
    const chatRoomResponse = await chatController.createChatRoomInternal(chatRoomData);

    if (!chatRoomResponse.success) {
      throw new Error('채팅방 생성 실패');
    }

    const chatRoomId = chatRoomResponse.chatRoomId;

    const newMeeting = await Meeting.create({
      title,
      description,
      start_time,
      end_time,
      location,
      deadline,
      type,
      created_by,
      chatRoomId,
    });

    await MeetingParticipant.create({
      meeting_id: newMeeting.id,
      user_id: created_by,
    });

    return { meeting_id: newMeeting.id, chatRoomId: chatRoomResponse.chatRoomId };
  }

  async getMeetings(userId) {
    const meetings = await Meeting.findAll({
      attributes: ['id', 'title', 'description', 'start_time', 'end_time', 'location', 'deadline', 'type'],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['name'],
        },
        {
          model: MeetingParticipant,
          as: 'participants',
          attributes: ['user_id'],
        },
      ],
    });

    return meetings.map((meeting) => {
      const creatorName = meeting.creator ? meeting.creator.name : 'Unknown';
      const isParticipant = meeting.participants.some(participant => participant.user_id === parseInt(userId, 10));

      return new MeetingResponse(
        meeting,
        isParticipant,
        false,
        creatorName
      );
    });
  }

  async closeMeeting(meetingId) {
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      throw new Error('모임을 찾을 수 없습니다.');
    }

    if (meeting.type === 'CLOSE') {
      throw new Error('이미 마감된 모임입니다.');
    }

    meeting.type = 'CLOSE';
    await meeting.save();
    return meeting;
  }

  async joinMeeting(meetingId, userId) {
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      throw new Error('모임을 찾을 수 없습니다.');
    }

    if(meeting.type === 'CLOSE') {
      throw new Error('이미 마감된 모임입니다.');
    }

    if (new Date() > new Date(meeting.deadline)) {
      throw new Error('참가 신청이 마감되었습니다.');
    }

    const existingParticipant = await MeetingParticipant.findOne({ 
      where: { meeting_id: meetingId, user_id: userId } 
    });
    
    if (existingParticipant) {
      throw new Error('이미 참가한 사용자입니다.');
    }

    await MeetingParticipant.create({ meeting_id: meetingId, user_id: userId });

    const user = await User.findOne({ where: { id: userId } });
    const chatRoom = await ChatRoom.findOne({ meeting_id: meetingId });

    if (chatRoom && !chatRoom.participants.includes(user.name)) {
      chatRoom.participants.push(user.name);
      chatRoom.isOnline.set(user.name, true);
      chatRoom.lastReadAt.set(user.name, new Date());
      chatRoom.lastReadLogId.set(user.name, null);
      await chatRoom.save();
    }
  }

  async getMeetingDetail(meetingId) {
    const meeting = await Meeting.findByPk(meetingId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['name']
        },
        {
          model: MeetingParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'participantUser',
              attributes: ['name', 'email']
            }
          ]
        }
      ]
    });

    if (!meeting) {
      throw new Error('모임을 찾을 수 없습니다.');
    }

    return new MeetingDetailResponse(meeting);
  }
}

module.exports = new MeetingService();
