const http = require('http');
const crypto = require('crypto');
// const ChatRoom = require('./models/chatRoom.js');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const ChatRoom = require('./models/chatRooms');

// .env 파일 로드
dotenv.config();

// 서비스 계정 키 파일 경로를 환경 변수에서 가져오기
const serviceAccountPath = process.env.FIREBASE_CREDENTIAL_PATH;

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

// WebSocket 관련 데이터
let clients = [];
let chatRooms = {};

// MongoDB 연결 설정
async function connectMongoDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/chat', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB에 성공적으로 연결되었습니다.');

    // MongoDB 연결 성공 후 WebSocket 서버 시작
    startWebSocketServer();
  } catch (err) {
    console.error('MongoDB 연결 실패:', err);
    process.exit(1);
  }
}

// 채팅방 기록 불러오기 함수
async function getChatHistory(chatRoomId) {
  const chatRoom = await ChatRoom.findOne({ chatRoomId });
  return chatRoom ? chatRoom.messages : [];
}

// WebSocket 서버 생성 및 핸드셰이크 처리
function startWebSocketServer() {
  const wsServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running');
  });

  wsServer.on('upgrade', (req, socket, head) => {
    const key = req.headers['sec-websocket-key'];
    const acceptKey = generateAcceptValue(key);
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`
    ];
    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

    // 클라이언트를 clients 배열에 추가
    clients.push(socket);

    let chatRoomId = null;
    let nickname = null;

    socket.on('data', async buffer => {
      let message;
      try {
        message = parseMessage(buffer);
        const parsedData = JSON.parse(message);
        const { type, chatRoomId: clientChatRoomId, nickname: clientNickname, text } = parsedData;

        console.log('서버에서 수신한 메시지:', { type, clientChatRoomId, clientNickname, text });

        if (type === 'join' || type === 'leave') {
          await ChatRoom.updateOne(
            { chatRoomId: clientChatRoomId },
            { $set: { [`isOnline.${clientNickname}`]: type === 'join' } }
          );

          const statusMessage = {
            type: 'status',
            chatRoomId: clientChatRoomId,
            nickname: clientNickname,
            isOnline: type === 'join',
          };

          clients.forEach(client => {
            client.write(constructReply(JSON.stringify(statusMessage)));
          });
        }

        if (type === 'join') {
          chatRoomId = clientChatRoomId;
          nickname = clientNickname;

          await ChatRoom.updateOne(
            { chatRoomId },
            {
              $set: {
                [`isOnline.${nickname}`]: true,
                [`lastReadLogId.${nickname}`]: null,
              },
            }
          );

          if (!chatRooms[chatRoomId]) {
            chatRooms[chatRoomId] = [];
          }

          const chatRoom = await ChatRoom.findOne({ chatRoomId });

          // 참가자 확인
          const participantIndex = chatRoom.participants.findIndex(participant => participant.name === nickname);
          if (participantIndex !== -1) {
            const existingParticipant = chatRoom.participants[participantIndex];

            // 참가자 상태 업데이트
            existingParticipant.isOnline = true;
            existingParticipant.lastReadAt = new Date();

            await chatRoom.save();
          } else {
            // 새 참가자 추가
            const joinMessage = {
              message: `${nickname}님이 참가했습니다.`,
              timestamp: new Date(),
              type: 'join'
            };

            chatRoom.participants.push({
              name: nickname,
              fcmTokens: parsedData.fcmToken ? [parsedData.fcmToken] : [],
              lastReadAt: new Date(),
              lastReadLogId: null,
              isOnline: true,
            });

            chatRoom.messages.push(joinMessage);

            await chatRoom.save();

            clients.forEach(client => {
              client.write(constructReply(JSON.stringify(joinMessage)));
            });

            console.log(`${nickname} 새 참가자로 추가`);
          }

          try {
            const previousMessages = await getChatHistory(chatRoomId);
            if (previousMessages.length > 0) {
              socket.write(constructReply(JSON.stringify({ type: 'previousMessages', messages: previousMessages })));
              console.log(`이전 메시지 전송: ${previousMessages.length}개`);
            } 
          } catch (err) {
            console.error('이전 채팅 기록 불러오기 중 오류 발생:', err);
          }

        } else if (type === 'message') {
          const chatMessage = {
            message: text,
            timestamp: new Date(),
            type: 'message',
            sender: nickname
          };


          chatRooms[chatRoomId].push(chatMessage);

          try {
            // 새로운 메시지를 messages 배열에 추가
            const updatedChatRoom = await ChatRoom.findOneAndUpdate(
              { chatRoomId }, 
              { $push: { messages: chatMessage } },
              { new: true, fields: { "messages": { $slice: -1 } } }  // 마지막 추가된 메시지만 가져옴
            );

            // 마지막에 추가된 메시지의 _id를 가져오기
            const savedMessage = updatedChatRoom.messages[updatedChatRoom.messages.length - 1];

            // 새로운 메시지 전송: 클라이언트로 메시지 브로드캐스트
            const messageData = {
              type: 'message',
              chatRoomId,
              sender: nickname,
              message: text,
              timestamp: chatMessage.timestamp,
              _id: savedMessage._id  // 저장된 메시지의 _id 사용
            };

            clients.forEach(client => {
              client.write(constructReply(JSON.stringify(messageData)));
              console.log('채팅 메시지 전송:', messageData);
            });

            // 오프라인 사용자에게 FCM 푸시 알림 전송
            const chatRoom = await ChatRoom.findOne({ chatRoomId });
            const offlineParticipants = chatRoom.participants.filter(participant => {
            // isOnline 상태를 Map에서 가져오기
            const isOnline = chatRoom.isOnline.get(participant.name);
              return isOnline === false; // 정확히 false인 사용자만 필터링
            });


            for (const participant of offlineParticipants) {
              const tokens = participant.fcmTokens || [];
              // console("푸시 알림 보내는 토큰", tokens);
              if (tokens.length > 0) {
                const message = {
                  tokens, // FCM 토큰 배열
                  notification: {
                    title: `${chatRoom.chatRoomName}`,
                    body: `${nickname}: ${text}`,
                  },
                  data: {
                    key1: 'value1',
                    key2: 'value2',
                  },
                  android: {
                    priority: 'high',
                  },
                  apns: {
                    payload: {
                      aps: {
                        sound: 'default',
                      },
                    },
                  },
                };

                try {
                  console.log(`푸시 알림 전송 중 (${participant.name}):`, message); // 디버깅 로그 추가
                  const response = await admin.messaging().sendEachForMulticast(message);
                  console.log(`푸시 알림 전송 성공 (${participant.name}):`, response.successCount);
                } catch (error) {
                  console.error(`푸시 알림 전송 실패 (${participant.name}):`, error);
                }
              } else {
                console.log(`사용자 ${participant.name}의 FCM 토큰이 없습니다.`);
              }
            }
          } catch (err) {
            console.error('MongoDB 채팅 메시지 저장 오류:', err);
          }
        } else if (type === 'leave') {
          const leaveMessage = { 
            message: `${nickname}님이 퇴장했습니다.`, 
            timestamp: new Date(),
            type: 'leave'
          };
          
          chatRooms[chatRoomId].push(leaveMessage);

          await ChatRoom.updateOne(
            { chatRoomId },
            { $set: { [`isOnline.${nickname}`]: false } }
          );

          await ChatRoom.updateOne({ chatRoomId }, {
            $push: { messages: leaveMessage },
            $pull: { participants: nickname }
          });

          clients.forEach(client => {
            client.write(constructReply(JSON.stringify(leaveMessage)));
          });

          clients = clients.filter(client => client !== socket);
        }
      } catch (err) {
        console.error('메시지 처리 중 오류 발생:', err);
      }
    });

    socket.on('close', async () => {
      if (nickname && chatRoomId) {
        await ChatRoom.updateOne(
          { chatRoomId },
          { $set: { [`isOnline.${nickname}`]: false } }
        );

        const statusMessage = {
          type: 'status',
          chatRoomId,
          nickname,
          isOnline: false,
        };

        clients.forEach(client => {
          client.write(constructReply(JSON.stringify(statusMessage)));
        });
      }
    });

    socket.on('error', (err) => {
      console.error(`WebSocket error: ${err}`);
      clients = clients.filter(client => client !== socket);
    });
  });

  wsServer.listen(8081, () => {
    console.log('WebSocket 채팅 서버가 8081 포트에서 실행 중입니다.');
  });
}

// Sec-WebSocket-Accept 헤더 값 생성 -> env처리
function generateAcceptValue(key) {
  return crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary').digest('base64');
}

// WebSocket 메시지 파싱 함수
function parseMessage(buffer) {
  const byteArray = [...buffer];
  const secondByte = byteArray[1];
  let length = secondByte & 127;
  let maskStart = 2;

  if (length === 126) {
    length = (byteArray[2] << 8) + byteArray[3];
    maskStart = 4;
  } else if (length === 127) {
    length = 0;
    for (let i = 0; i < 8; i++) {
      length = (length << 8) + byteArray[2 + i];
    }
    maskStart = 10;
  }

  const dataStart = maskStart + 4;
  const mask = byteArray.slice(maskStart, dataStart);
  const data = byteArray.slice(dataStart, dataStart + length).map((byte, i) => byte ^ mask[i % 4]);

  return new TextDecoder('utf-8').decode(Uint8Array.from(data));
}

// 클라이언트 메시지 응답 생성 함수
function constructReply(message) {
  const messageBuffer = Buffer.from(message, 'utf-8');
  const length = messageBuffer.length;
  const reply = [0x81];
  if (length < 126) {
    reply.push(length);
  } else if (length < 65536) {
    reply.push(126, (length >> 8) & 255, length & 255);
  } else {
    reply.push(
      127,
      (length >> 56) & 255,
      (length >> 48) & 255,
      (length >> 40) & 255,
      (length >> 32) & 255,
      (length >> 24) & 255,
      (length >> 16) & 255,
      (length >> 8) & 255,
      length & 255
    );
  }
  return Buffer.concat([Buffer.from(reply), messageBuffer]);
}

// MongoDB 연결 후 WebSocket 서버 시작
connectMongoDB();