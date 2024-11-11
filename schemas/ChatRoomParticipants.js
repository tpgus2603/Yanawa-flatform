const ChatRoomParticipantSchema = new Schema({
  chat_room_id: {
    type: mongoose.Schema.Types.BigInt,
    ref: 'ChatRoom',
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.BigInt,
    ref: 'User',
    required: true,
  },
  joined_at: {
    type: Date,
    default: Date.now,
  },
  left_at: {
    type: Date,
    default: null,
  },
});

// 복합 인덱스 생성하여 중복 참여 방지
ChatRoomParticipantSchema.index({ chat_room_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('ChatRoomParticipant', ChatRoomParticipantSchema);
