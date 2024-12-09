const amqp = require('amqplib');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// .env 파일 로드
dotenv.config();

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.cert(require(process.env.FIREBASE_CREDENTIAL_PATH)),
});

// RabbitMQ에서 메시지를 소비하고 FCM 알림 전송
async function startPushServer() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await connection.createChannel();

  const chatQueue = 'chat_push_notifications';
  const meetingQueue = 'meeting_push_notifications';

  await channel.assertQueue(chatQueue, { durable: true });
  await channel.assertQueue(meetingQueue, { durable: true });

  console.log(`푸시 서버가 큐 ${chatQueue} 및 ${meetingQueue}에서 메시지를 기다리고 있습니다.`);

  // Chat Push 처리
  channel.consume(chatQueue, async (msg) => {
    if (msg !== null) {
      const event = JSON.parse(msg.content.toString());
      const { chatRoomName, sender, messageContent, offlineParticipants, chatRoomId } = event;

      console.log('Chat 푸시 알림 요청 수신:', event);
      

      for (const participant of offlineParticipants) {
        const tokens = participant.fcmTokens || [];
        if (tokens.length > 0) {
          const message = {
            tokens,
            notification: {
              title: `${chatRoomName}`,
              body: `${sender}: ${messageContent}`,
            },
            data: {
              click_action: `${process.env.FRONT_URL}/chat/chatRoom/${chatRoomId}`, // 클릭 시 이동할 URL
            },
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
          };

          try {
            const response = await admin.messaging().sendEachForMulticast(message);
            response.responses.forEach((res, index) => {
              if (!res.success) {
                console.error(`Chat 푸시 알림 실패 - ${tokens[index]}:`, res.error);
              } else {
                console.log(`Chat 푸시 알림 성공 - ${tokens[index]}`);
              }
            });
          } catch (error) {
            console.error(`Chat 푸시 알림 전송 오류:`, error);
          }
        }
      }

      channel.ack(msg);
    }
  });

  // Meeting Push 처리
  channel.consume(meetingQueue, async (msg) => {
    if (msg !== null) {
      const event = JSON.parse(msg.content.toString());
      const { meetingTitle, inviterName, inviteeTokens, type } = event;

      console.log('Meeting 푸시 알림 요청 수신:', event);
      console.log("푸시 알림 보내는 fcmToken", inviteeTokens);

      if (inviteeTokens.length > 0) {
        let message;
        
        // 이벤트 타입에 따라 알림 내용 구성
        if (type === 'invite') {
            message = {
                tokens: inviteeTokens,
                notification: {
                    title: '번개 모임 초대',
                    body: `${inviterName}님이 ${meetingTitle} 번개모임에 초대했습니다.`,
                },
                data: {
                    click_action: `${process.env.FRONT_URL}/meeting`, // 클릭 시 이동할 URL
                },
                android: { priority: 'high' },
                apns: { payload: { aps: { sound: 'default' } } },
            };
        } else if (type === 'join') {
            message = {
                tokens: inviteeTokens,
                notification: {
                    title: `${meetingTitle}`,
                    body: `${inviterName}님이 ${meetingTitle} 모임에 참가했습니다.`,
                },
                data: {
                    click_action: `${process.env.FRONT_URL}/meeting`, // 클릭 시 이동할 URL
                },
                android: { priority: 'high' },
                apns: { payload: { aps: { sound: 'default' } } },
            };
        }

        try {
          const response = await admin.messaging().sendEachForMulticast(message);
          console.log(`Meeting 푸시 알림 전송 성공:`, response.successCount);
        } catch (error) {
          console.error(`Meeting 푸시 알림 전송 실패:`, error);
        }
      }

      channel.ack(msg);
    }
  });
}

startPushServer().catch((error) => {
  console.error('푸시 서버 시작 실패:', error);
});