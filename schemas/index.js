const mongoose = require('mongoose');

// MongoDB 연결
mongoose.connect('mongodb://localhost:27017/chatDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB 연결 성공'))
.catch(err => console.error('MongoDB 연결 실패:', err));

// 위에서 정의한 ChatRoom, ChatRoomParticipant, Message 모델을 사용
const ChatRoom = require('./models/ChatRoom');
const ChatRoomParticipant = require('./models/ChatRoomParticipant');
const Message = require('./models/Message');

// 예시: 채팅방 생성
async function createChatRoom(data) {
  try {
    const chatRoom = new ChatRoom(data);
    await chatRoom.save();
    console.log('채팅방 생성 완료:', chatRoom);
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
  }
}

// 예시 함수 호출
createChatRoom({
  name: '일반 채팅방',
  type: 'OPEN',
  created_by: 1, // 관계형 DB의 Users.id와 일치
});
