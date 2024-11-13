// schemas/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chat_room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
  },
  sender_id: {
    type: Number, // SQL의 Users 테이블 ID 참조
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
}, {
  timestamps: { createdAt: 'sent_at', updatedAt: false },
});

module.exports = mongoose.model('Message', MessageSchema);
