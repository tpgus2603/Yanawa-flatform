const mongoose = require('mongoose');

// MongoDB 채팅방 스키마 수정 (현재 참가 중인 유저 목록 추가)
const chatRoomsSchema = new mongoose.Schema({
  chatRoomId: { type: String, required: true, unique: true },
  messages: [{
    sender: String,
    message: String,
    timestamp: Date,
    type: { type: String, default: 'message' }  // 기본값은 'message', 다른 값으로 'join', 'leave' 가능
  }],
  participants: [{ type: String }],
  lastReadAt: { type: Map, of: Date }, // 각 참가자의 마지막 읽은 메시지 시간 기록
  lastReadLogId: { type: Map, of: String },  // 각 참가자의 마지막으로 읽은 logID 기록
  isOnline: { type: Map, of: Boolean } // 각 참가자의 온라인 상태
}, { collection: 'chatrooms' });

// 모델이 이미 정의되어 있는 경우 재정의하지 않음
const ChatRooms = mongoose.models.ChatRooms || mongoose.model('ChatRooms', chatRoomsSchema);

module.exports = ChatRooms;