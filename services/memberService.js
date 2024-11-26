const User = require('../models/User');
const FcmToken = require('../models/fcmToken');
const ChatRooms = require('../schemas/ChatRooms');

class MemberService {
  async registerToken(email, fcmToken) {
    console.log(`Registering FCM token for email: ${email}, token: ${fcmToken}`);

    // 1. RDB에서 사용자 검색
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('User not found');

    console.log(`User found: ${user.name}`);

    // 2. RDB의 FcmTokens 테이블에 저장
    const existingToken = await FcmToken.findOne({
      where: { userId: user.id, token: fcmToken },
    });

    if (!existingToken) {
      await FcmToken.create({ userId: user.id, token: fcmToken });
      console.log(`FCM token ${fcmToken} saved to FcmTokens table`);
    } else {
      console.log(`FCM token ${fcmToken} already exists for user ${user.name}`);
    }

    // 3. MongoDB에서 관련 채팅방의 FCM 토큰 업데이트
    const existingChatRooms = await ChatRoom.find({ "participants.name": user.name });
    for (const room of existingChatRooms) {
      room.participants = room.participants.map((participant) => {
        if (participant.name === user.name) {
          const currentFcmTokens = participant.fcmTokens || [];
          if (!currentFcmTokens.includes(fcmToken)) {
            participant.fcmTokens = Array.from(new Set([...currentFcmTokens, fcmToken]));
          }
        }
        return participant;
      });
      await room.save();
    }

    console.log(`FCM token registration process completed for email: ${email}`);
    return { message: 'FCM token registered successfully' };
  }
}

module.exports = new MemberService();