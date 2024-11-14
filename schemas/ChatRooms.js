// schemas/ChatRoom.js

const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  meeting_id: {
    type: Number, // SQL의 Meetings 테이블 ID 참조
    default: null,
  },
  type: {
    type: String,
    enum: ['OPEN', 'CLOSE'],
    required: true,
  },
  created_by: {
    type: Number, // SQL의 Users 테이블 ID 참조
    required: true,
  },
}, {
  timestamps: true, // createdAt, updatedAt 자동 관리
});

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
