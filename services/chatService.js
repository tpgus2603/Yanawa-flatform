const ChatRoom = require('../models/chatRooms');
const { v4: uuidv4 } = require('uuid');

class ChatService {

  // 채팅방 생성
  async createChatRoom({ meeting_id, participants }) {
    try {
      const chatRoomId = uuidv4();
      const newRoom = new ChatRoom({
        chatRoomId: chatRoomId,
        meeting_id,
        participants,
        messages: [],
        lastReadAt: participants.reduce((acc, user) => {
          acc[user] = new Date();
          return acc;
        }, {}),
        lastReadLogId: participants.reduce((acc, user) => {
          acc[user] = null;
          return acc;
        }, {}),
        isOnline: participants.reduce((acc, user) => {
          acc[user] = true;
          return acc;
        }, {}),
      });

      const joinMessage = {
        message: `${participants[0]}님이 번개 모임을 생성했습니다.`,
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
  async getChatRooms() {
    const rooms = await ChatRoom.find({}, { chatRoomId: 1, messages: { $slice: -1 } });
    return rooms.map(room => {
      const lastMessage = room.messages[0] || {};
      return {
        chatRoomId: room.chatRoomId,
        lastMessage: {
          sender: lastMessage.sender || '없음',
          message: lastMessage.message || '메시지 없음',
          timestamp: lastMessage.timestamp || null,
        }
      };
    });
  }

  // 사용자 상태 업데이트
  async updateStatus(chatRoomId, nickname, isOnline) {
    await ChatRoom.updateOne(
      { chatRoomId },
      { $set: { [`isOnline.${nickname}`]: isOnline } }
    );
  }

  // 읽음 상태 업데이트
  async updateReadStatus(chatRoomId, nickname) {
    const now = new Date();
    await ChatRoom.updateOne(
      { chatRoomId },
      { $set: { [`lastReadAt.${nickname}`]: now } }
    );
  }

  // 읽지 않은 메시지 조회
  async getUnreadMessages(nickname) {
    const chatRooms = await ChatRoom.find({ participants: nickname });
    return await Promise.all(chatRooms.map(async (chatRoom) => {
      const lastReadAt = chatRoom.lastReadAt.get(nickname) || new Date(0);
      const unreadMessagesCount = chatRoom.messages.filter(message => 
        message.timestamp > lastReadAt
      ).length;
      return {
        chatRoomId: chatRoom.chatRoomId,
        unreadCount: unreadMessagesCount,
      };
    }));
  }

  // 읽지 않은 메시지 수 조회
  async getUnreadCount(chatRoomId) {
    const chatRoom = await ChatRoom.findOne({ chatRoomId });
    if (!chatRoom) {
      throw new Error('Chat room not found');
    }

    const unreadCounts = chatRoom.participants
      .filter(user => chatRoom.lastReadLogId.get(user))
      .map(user => chatRoom.lastReadLogId.get(user))
      .reduce((acc, logId) => {
        acc[logId] = (acc[logId] || 0) + 1;
        return acc;
      }, {});

    let count = 0;
    return Object.entries(unreadCounts)
      .sort(([logId1], [logId2]) => logId1.localeCompare(logId2))
      .reduce((acc, [logId, value]) => {
        count += value;
        acc[count] = logId;
        return acc;
      }, {});
  }

  // 읽은 메시지 로그 ID 업데이트
  async updateReadLogId(chatRoomId, nickname, logId) {
    await ChatRoom.updateOne(
      { chatRoomId },
      { $set: { [`lastReadLogId.${nickname}`]: logId } }
    );
  }

  // 상태와 로그 ID 동시 업데이트
  async updateStatusAndLogId(chatRoomId, nickname, isOnline, logId) {
    let finalLogId = logId;

    if (!isOnline && logId === null) {
      const chatRoom = await ChatRoom.findOne({ chatRoomId });
      if (chatRoom && chatRoom.messages.length > 0) {
        finalLogId = chatRoom.messages[chatRoom.messages.length - 1]._id;
      }
    }

    await ChatRoom.updateOne(
      { chatRoomId },
      {
        $set: {
          [`isOnline.${nickname}`]: isOnline,
          [`lastReadLogId.${nickname}`]: isOnline ? null : finalLogId,
        },
      }
    );
  }
}

module.exports = new ChatService();
