const MessageSchema = new Schema({
  chat_room_id: {
    type: mongoose.Schema.Types.BigInt,
    ref: 'ChatRoom',
    required: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.BigInt,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sent_at: {
    type: Date,
    default: Date.now,
  },
});

// 인덱스 추가하여 조회 성능 향상
MessageSchema.index({ chat_room_id: 1, sent_at: -1 });

module.exports = mongoose.model('Message', MessageSchema);
