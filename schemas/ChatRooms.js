const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatRoomSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  meeting_id: {
    type: mongoose.Schema.Types.BigInt, // 관계형 DB의 Meetings.id와 연동
    ref: 'Meeting',
    default: null,
  },
  type: {
    type: String,
    enum: ['OPEN', 'CLOSE'],
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.BigInt, // 관계형 DB의 Users.id와 연동
    ref: 'User',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
