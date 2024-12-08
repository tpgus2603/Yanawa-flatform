const mongoose = require('mongoose');

const chatRoomsSchema = new mongoose.Schema({
  chatRoomId: { type: String, required: true, unique: true },
  chatRoomName: { type: String, required: true },
  messages: [{
    sender: String,
    message: String,
    timestamp: Date,
    type: { type: String, default: 'message' }, // 기본값은 'message', 다른 값으로 'join', 'leave' 가능
  }],
  participants: [{
    name: { type: String, required: true },
    fcmTokens: { type: [String], default: [] }, // FCM 토큰 배열
  }],
  lastReadAt: { type: Map, of: Date },
  lastReadLogId: { type: Map, of: String },
  isOnline: { type: Map, of: Boolean },
  notices: [{ 
    sender: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }, 
  }]
}, { collection: 'chatrooms' });

const ChatRooms = mongoose.models.ChatRooms || mongoose.model('ChatRooms', chatRoomsSchema);
module.exports = ChatRooms;