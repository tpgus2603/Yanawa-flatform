// schemas/ChatRoomParticipant.js

const mongoose = require('mongoose');

const ChatRoomParticipantSchema = new mongoose.Schema({
  chat_room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
  },
  user_id: {
    type: Number, // SQL의 Users 테이블 ID 참조
    required: true,
  },
  left_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: { createdAt: 'joined_at', updatedAt: false },
});

module.exports = mongoose.model('ChatRoomParticipant', ChatRoomParticipantSchema);
