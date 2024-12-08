const http = require('http');
const crypto = require('crypto');
// const ChatRoom = require('./models/chatRoom.js');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const amqp = require('amqplib'); // RabbitMQ 연결
const ChatRoom = require('./schemas/ChatRooms');

// .env 파일 로드
dotenv.config();

const HEARTBEAT_TIMEOUT = 10000; // 10초 후 타임아웃

// RabbitMQ 연결 풀 생성
let amqpConnection, amqpChannel;

// WebSocket 관련 데이터
let clients = [];

// 클라이언트 상태를 저장하는 Map
const clientHeartbeats = new Map();

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

// // RabbitMQ 메시지 발행 함수
// async function publishToQueue(queue, message) {
//   const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
//   const channel = await connection.createChannel();
//   await channel.assertQueue(queue, { durable: true });
//   channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
//   console.log(`Message sent to queue ${queue}:`, message);
//   setTimeout(() => connection.close(), 500); // 연결 닫기
// }

async function setupRabbitMQ() {
  try {
    amqpConnection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    amqpChannel = await amqpConnection.createChannel();
    console.log('RabbitMQ connection established');
  } catch (err) {
    logError('RabbitMQ Setup', err);
    process.exit(1);
  }
}

async function publishToQueue(queue, message) {
  try {
    await amqpChannel.assertQueue(queue, { durable: true });
    amqpChannel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    console.log(`Message sent to queue ${queue}:`, message);
  } catch (err) {
    logError('RabbitMQ Publish', err);
  }
}

// RabbitMQ를 통해 푸시 알림 요청을 전송하는 함수
async function sendPushNotificationRequest(chatRoomName, sender, messageContent, offlineParticipants, chatRoomId) {
  const event = {
    chatRoomName,
    sender,
    messageContent,
    offlineParticipants,
    chatRoomId,
  };
  await publishToQueue('chat_push_notifications', event); // push_notifications 큐에 메시지 발행
}

// 채팅방 기록 불러오기 함수
async function getChatHistory(chatRoomId) {
  const chatRoom = await ChatRoom.findOne({ chatRoomId });
  return chatRoom ? chatRoom.messages : [];
}

function startWebSocketServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running');
  });

  server.on('upgrade', (req, socket, head) => {
    handleWebSocketUpgrade(req, socket);
  });

  server.listen(8081, () => {
    console.log('WebSocket 채팅 서버가 8081 포트에서 실행 중입니다.');
  });
}

function handleWebSocketUpgrade(req, socket) {
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

  socket.on('data', async buffer => {
    try {
      message = parseMessage(buffer);
      if (!message) return; // 메시지가 비어 있는 경우 무시

      const parsedData = JSON.parse(message);
      const { type, chatRoomId: clientChatRoomId, nickname: clientNickname, text } = parsedData;
      await handleClientMessage(socket, parsedData);
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  socket.on('close', async () => {

      console.log(`WebSocket 연결이 종료되었습니다: ${socket.nickname}, ${socket.chatRoomId}`);

      // 클라이언트 Heartbeat 맵에서 제거
      clientHeartbeats.delete(socket);

      // 클라이언트 목록에서 제거
      clients = clients.filter((client) => client !== socket);


      // 소켓 종료 전, 창 닫기 or hidden 때문에 이미 온라인 상태 false로 됨 (중복 로직 주석 처리)
      // if (socket.nickname && socket.chatRoomId) {
      //   await ChatRoom.updateOne(
      //     { chatRoomId: socket.chatRoomId },
      //     { $set: { [`isOnline.${socket.nickname}`]: false } }
      //   );
      // }
  });

  socket.on('error', (err) => {
    console.error(`WebSocket error: ${err}`);
    clients = clients.filter((client) => client !== socket);
  });

}

// 메시지 타입 처리
async function handleClientMessage(socket, data) {
  const { type, chatRoomId, nickname, text, fcmToken } = data;

  // 타임아웃된 소켓 차단
  if (socket.isTimedOut) {
    console.log(`타임아웃된 클라이언트의 재연결을 차단: ${nickname}`);
    return;
  }

  switch (type) {
    case 'heartbeat':
      // console.log(`Heartbeat received from ${nickname} in room ${chatRoomId}`);
      clientHeartbeats.set(socket, Date.now());
      break;
    case 'join':
      // WebSocket에 사용자 정보 저장
      // socket.nickname = nickname;
      // socket.chatRoomId = chatRoomId;
      await handleJoin(socket, chatRoomId, nickname, fcmToken);
      break;
    case 'message':
      await handleMessage(chatRoomId, nickname, text);
      break;
    case 'leave':
      await handleLeave(chatRoomId, nickname);
      break;
    case 'notice':
      await handleSetNotice(chatRoomId, nickname, text);
      break;
    default:
      console.log(`Unknown message type: ${type}`);
  }
}

// join - 참가 메시지
async function handleJoin(socket, chatRoomId, nickname) {
  if (socket.isTimedOut) {
    console.log(`타임아웃된 클라이언트의 재참여를 차단: ${nickname}`);
    return;
  }

  // Set client properties
  socket.chatRoomId = chatRoomId;
  socket.nickname = nickname;

  console.log(`Client joined room: ${chatRoomId}, nickname: ${nickname}`);

  await ChatRoom.updateOne(
    { chatRoomId: chatRoomId },
    { $set: { [`isOnline.${nickname}`]:true } }
  );

  const statusMessage = {
    type: 'status',
    chatRoomId: chatRoomId,
    nickname: nickname,
    isOnline: true,
  };

  broadcastMessage(chatRoomId, statusMessage);

  await ChatRoom.updateOne(
    { chatRoomId },
    { $set: {
      [`isOnline.${nickname}`]: true,
      [`lastReadLogId.${nickname}`]: null,
      },
    }
  );

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

      broadcastMessage(chatRoomId, joinMessage);

      console.log(`${nickname} 새 참가자로 추가`);
    }

  const previousMessages = await getChatHistory(chatRoomId);
  if (previousMessages.length > 0) {
    socket.write(constructReply(JSON.stringify({ type: 'previousMessages', messages: previousMessages })));
  }
}

// meessage - 일반 메시지
async function handleMessage(chatRoomId, nickname, text) {
  const chatMessage = { message: text, timestamp: new Date(), type: 'message', sender: nickname };

  try {
    const updatedChatRoom = await ChatRoom.findOneAndUpdate(
      { chatRoomId },
      { $push: { messages: chatMessage } },
      { new: true, fields: { messages: { $slice: -1 } } }
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

    console.log('채팅에서 Current clients:', clients.map(client => client.chatRoomId));

    // broadcastMessage(chatRoomId, messageData);

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

    console.log("offlineParticipants", offlineParticipants);

    // RabbitMQ에 푸시 알림 요청 발행
    await sendPushNotificationRequest(chatRoom.chatRoomName, nickname, text, offlineParticipants, chatRoomId);
    
  } catch (err) {
    console.error('Error saving message to MongoDB:', err);
  }
}

// leave - 퇴장 메시지
async function handleLeave(chatRoomId, nickname) {
  await ChatRoom.updateOne(
    { chatRoomId: clientChatRoomId },
    { $set: { [`isOnline.${clientNickname}`]: type === 'leave' } }
  );

  const statusMessage = {
    type: 'status',
    chatRoomId: clientChatRoomId,
    nickname: clientNickname,
    isOnline: type === 'leave',
  };

  clients.forEach(client => {
    client.write(constructReply(JSON.stringify(statusMessage)));
  });

  const leaveMessage = { message: `${nickname} 님이 퇴장했습니다.`, timestamp: new Date(), type: 'leave' };
  await ChatRoom.updateOne({ chatRoomId }, { $push: { messages: leaveMessage } });
  broadcastMessage(chatRoomId, leaveMessage);
}

async function handleSetNotice(chatRoomId, sender, message) {
  const notice = {
    sender,
    message,
    timestamp: new Date(),
  };

  try {
    // MongoDB에 최신 공지 저장
    await ChatRoom.updateOne(
      { chatRoomId },
      { $push: { notices: notice } }
    );

    // 모든 클라이언트에게 공지사항 업데이트 메시지 전송
    const noticeMessage = {
      type: 'notice',
      chatRoomId,
      sender,
      message,
    };
    
    clients.forEach(client => {
      client.write(constructReply(JSON.stringify(noticeMessage)));
    });

    // broadcastMessage(chatRoomId, noticeMessage);

    console.log('공지사항 업데이트:', noticeMessage);
  } catch (error) {
    console.error('공지사항 업데이트 실패:', error);
  }
}

// Broadcast message to clients in the same chat room
function broadcastMessage(chatRoomId, message) {
  clients.forEach((client) => {
    if (client.chatRoomId === chatRoomId) {
      client.write(constructReply(JSON.stringify(message)));
    }
  });
}

// 주기적으로 Heartbeat 상태 확인
setInterval(async () => {
  const now = Date.now();
  for (const [socket, lastHeartbeat] of clientHeartbeats.entries()) {
    if (now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log('타임아웃 대상 클라이언트:', {
        nickname: socket.nickname,
        chatRoomId: socket.chatRoomId,
        lastHeartbeat: new Date(lastHeartbeat).toISOString(),
      });

      // Heartbeat 맵에서 제거
      clientHeartbeats.delete(socket);

      // 상태 플래그 설정
      socket.isTimedOut = true;

       // 소켓 연결 종료
      socket.end();

      // 클라이언트 목록에서 제거
      clients = clients.filter((client) => client !== socket);

      // 클라이언트를 오프라인으로 설정
      console.log("Client timed out 후 오프라인 설정");
      await ChatRoom.updateOne(
        { [`isOnline.${socket.nickname}`]: false },
        { [`lastReadAt.${socket.nickname}`]: new Date() }
      );

      // 클라이언트에게 연결 종료 메시지 전송
      const timeoutMessage = JSON.stringify({
        type: 'status',
        nickname: socket.nickname,
        chatRoomId: socket.chatRoomId,
        isOnline: false,
      });
      
      clients.forEach(client => {
        client.write(constructReply(timeoutMessage));
      });

      
    }
  }
}, 5000); // 5초마다 상태 확인

// Sec-WebSocket-Accept 헤더 값 생성 -> env처리
function generateAcceptValue(key) {
  return crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary').digest('base64');
}

// WebSocket 메시지 파싱 함수
function parseMessage(buffer) {
  try {
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

    const decodedMessage = new TextDecoder('utf-8').decode(Uint8Array.from(data));

    // JSON 유효성 검사
    JSON.parse(decodedMessage);

    return decodedMessage;
  } catch (err) {
    console.error('Error parsing WebSocket message:', err.message);
    return null; // 유효하지 않은 메시지는 무시
  }
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

// 서버 시작 시 RabbitMQ 설정
setupRabbitMQ();

// MongoDB 연결 후 WebSocket 서버 시작
connectMongoDB();