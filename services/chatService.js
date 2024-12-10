const ChatRooms = require('../schemas/chatRooms');
const { v4: uuidv4 } = require('uuid');

class ChatService {
  // 채팅방 생성
  async createChatRoom({ meeting_id, participants, chatRoomName }) {
  try {
    const chatRoomId = uuidv4();
    const newRoom = new ChatRooms({
      chatRoomId,
      chatRoomName,
      meeting_id,
      messages: [],
    });

    const joinMessage = {
      message: `${participants[0].name}님이 번개 모임을 생성했습니다.`,
      timestamp: new Date(),
      type: 'join',
    };

    newRoom.messages.push(joinMessage);
    await newRoom.save();

    return { success: true, chatRoomId };
  } catch (err) {
    console.error('Error creating chat room:', err);
    throw new Error('Failed to create chat room');
  }
}

  // 채팅방 목록 조회
  async getChatRooms(name) {
    const rooms = await ChatRooms.find(
      { "participants.name": name },
      { chatRoomId: 1, chatRoomName: 1, messages: { $slice: -1 } }
    );
    return rooms.map(room => {
      const lastMessage = room.messages[0] || {};
      return {
        chatRoomId: room.chatRoomId,
        chatRoomName: room.chatRoomName,
        lastMessage: {
          sender: lastMessage.sender || '알림',
          message: lastMessage.message || '메시지 없음',
          timestamp: lastMessage.timestamp || null,
        },
      };
    });
  }

  // 사용자 상태 업데이트
  async updateStatus(chatRoomId, nickname, isOnline) {
    await ChatRooms.updateOne(
      { chatRoomId, "participants.name": nickname },
      { $set: { [`isOnline.${nickname}`]: isOnline } }
    );
  }

  // 읽음 상태 업데이트
  async updateReadStatus(chatRoomId, nickname) {
    const now = new Date();
    await ChatRooms.updateOne(
      { chatRoomId, "participants.name": nickname },
      { $set: { [`lastReadAt.${nickname}`]: now } }
    );
  }

  // 읽지 않은 메시지 조회
  async getUnreadMessages(nickname) {
    const chatRooms = await ChatRooms.find({ "participants.name": nickname });
    return await Promise.all(chatRooms.map(async (chatRooms) => {
      const lastReadAt = chatRooms.lastReadAt.get(nickname) || new Date(0);
      const unreadMessagesCount = chatRooms.messages.filter(message => 
        message.timestamp > lastReadAt
      ).length;
      return {
        chatRoomId: chatRooms.chatRoomId,
        unreadCount: unreadMessagesCount,
      };
    }));
  }

  // 읽지 않은 메시지 수 조회
  async getUnreadCount(chatRoomId) {
    const chatRooms = await ChatRooms.findOne({ chatRoomId });
    if (!chatRooms) {
      throw new Error('Chat room not found');
    }

    const unreadCounts = chatRooms.participants
      .filter(participant => chatRooms.lastReadLogId.has(participant.name)) // Map에 존재하는 키만 처리
      .map(participant => chatRooms.lastReadLogId.get(participant.name)) // lastReadLogId 값 추출
      .reduce((acc, logId) => {
        acc[logId] = (acc[logId] || 0) + 1; // logId 기준으로 등장 횟수 누적
        return acc;
      }, {});

    let count = 0;
    const sortedUnreadCounts = Object.entries(unreadCounts)
      .sort(([logId1], [logId2]) => logId1.localeCompare(logId2)) // logId 기준 오름차순 정렬
      .reduce((acc, [logId, value]) => {
        count += value; // 누적 합계
        acc[count] = logId; // 누적 합계를 키로 저장
        return acc;
      }, {});

    return sortedUnreadCounts;
  }

  // 읽은 메시지 로그 ID 업데이트
  async updateReadLogId(chatRoomId, nickname, logId) {
    await ChatRooms.updateOne(
      { chatRoomId, "participants.name": nickname },
      { $set: { [`lastReadLogId.${nickname}`]: logId } }
    );
  }

  // FCM 토큰 업데이트
  async updateFcmToken(chatRoomId, nickname, fcmToken) {
    const chatRooms = await ChatRooms.findOne({ chatRoomId, "participants.name": nickname });
    if (!chatRooms) {
      throw new Error('Chat room or participant not found');
    }

    const participant = chatRooms.participants.find(p => p.name === nickname);
    if (participant) {
      if (!participant.fcmTokens.includes(fcmToken)) {
        participant.fcmTokens.push(fcmToken);
        await chatRooms.save();
      }
    }
  }

  // 상태와 로그 ID 동시 업데이트
  async updateStatusAndLogId(chatRoomId, nickname, isOnline, logId) {
    let finalLogId = logId;

    if (!isOnline && logId === null) {
      const chatRooms = await ChatRooms.findOne({ chatRoomId });
      if (chatRooms && chatRooms.messages.length > 0) {
        finalLogId = chatRooms.messages[chatRooms.messages.length - 1]._id;
      }
    }

    await ChatRooms.updateOne(
      { chatRoomId, "participants.name": nickname },
      {
        $set: {
          [`isOnline.${nickname}`]: isOnline,
          [`lastReadLogId.${nickname}`]: isOnline ? null : finalLogId,
        },
      }
    );
  }

  // 메시지 전송
  async sendMessage(chatRoomId, sender, messageContent) {
    try {
      // 채팅방 조회
      const chatRooms = await ChatRooms.findOne({ chatRoomId });
      if (!chatRooms) {
        throw new Error('Chat room not found');
      }

      // 메시지 추가
      const newMessage = {
        sender,
        message: messageContent,
        timestamp: new Date(),
        type: 'message',
      };
      chatRooms.messages.push(newMessage);
      await chatRooms.save();

      // 오프라인 사용자 찾기
      const offlineParticipants = chatRooms.participants.filter(
        participant => !chatRooms.isOnline[participant.name]
      );

      // 오프라인 사용자들에게 FCM 푸시 알림 전송
      for (const participant of offlineParticipants) {
        const tokens = participant.fcmTokens || [];
        if (tokens.length > 0) {
          const message = {
            notification: {
              title: `새 메시지: ${chatRooms.chatRoomName}`,
              body: `${sender}: ${messageContent}`,
            },
            tokens,
          };

          try {
            const response = await admin.messaging().sendMulticast(message);
            console.log(
              `푸시 알림 전송 성공 (${participant.name}):`,
              response.successCount
            );
          } catch (error) {
            console.error(
              `푸시 알림 전송 실패 (${participant.name}):`,
              error
            );
          }
        }
      }

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // 공지사항 추가
  async addNotice(chatRoomId, sender, message) {
    try {
      const newNotice = {
        sender,
        message,
        timestamp: new Date(),
      };

      const updatedChatRoom = await ChatRooms.findOneAndUpdate(
        { chatRoomId },
        { $push: { notices: newNotice } }, // 공지사항 배열에 추가
        { new: true }
      );

      if (!updatedChatRoom) {
        throw new Error('Chat room not found');
      }

      return newNotice;
    } catch (error) {
      console.error('Error adding notice:', error.message);
      throw new Error('Failed to add notice');
    }
  }

  // 최신 공지사항 조회
  async getLatestNotice(chatRoomId) {
    try {
      const chatRoom = await ChatRooms.findOne(
        { chatRoomId },
        { notices: { $slice: -1 } } // 최신 공지 1개만 가져오기
      );

      if (!chatRoom || chatRoom.notices.length === 0) {
        return null;
      }

      return chatRoom.notices[0];
    } catch (error) {
      console.error('Error fetching latest notice:', error.message);
      throw new Error('Failed to fetch latest notice');
    }
  }

  // 공지사항 전체 조회
  async getAllNotices(chatRoomId) {
    try {
      const chatRoom = await ChatRooms.findOne({ chatRoomId }, { notices: 1 });

      if (!chatRoom) {
        throw new Error('Chat room not found');
      }

      return chatRoom.notices;
    } catch (error) {
      console.error('Error fetching all notices:', error.message);
      throw new Error('Failed to fetch all notices');
    }
  }

  // 공지사항 상세 조회
  async getNoticeById(chatRoomId, noticeId) {
    try {
      const chatRoom = await ChatRooms.findOne({ chatRoomId });
      if (!chatRoom) {
        throw new Error('Chat room not found');
      }

      const notice = chatRoom.notices.find(notice => notice._id.toString() === noticeId);
      if (!notice) {
        throw new Error('Notice not found');
      }

      return notice;
    } catch (error) {
      console.error('Error in getNoticeById:', error.message);
      throw error;
    }
  }

}

module.exports = new ChatService();