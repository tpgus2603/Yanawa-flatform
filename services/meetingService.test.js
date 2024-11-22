// test/meetingService.test.js

// 1. ScheduleService 모킹
jest.mock('../services/scheduleService', () => ({
  createSchedules: jest.fn(),
  checkScheduleOverlapByTime: jest.fn(),
}));

// 2. ChatRooms 모킹
jest.mock('../models/ChatRooms', () => {
  const mockChatRooms = jest.fn().mockImplementation((chatRoomData) => {
    return {
      chatRoomId: chatRoomData.chatRoomId || 'chatroom-1234',
      participants: chatRoomData.participants || [],
      messages: chatRoomData.messages || [],
      lastReadAt: chatRoomData.lastReadAt || {},
      lastReadLogId: chatRoomData.lastReadLogId || {},
      isOnline: chatRoomData.isOnline || {},
      save: jest.fn().mockResolvedValue(true), // save 메서드 모킹
    };
  });

  mockChatRooms.findOne = jest.fn().mockResolvedValue({
    chatRoomId: 'chatroom-1234',
    participants: ['Alice'],
    messages: [],
    lastReadAt: {},
    lastReadLogId: {},
    isOnline: {},
    save: jest.fn().mockResolvedValue(true),
  });

  return mockChatRooms;
});

// 3. 모킹 이후에 서비스와 의존성 임포트
const models = require('../models'); // models/index.js에서 모델과 관계를 가져옴
const { User, Meeting, MeetingParticipant } = models;
const sequelize = models.sequelize;
const MeetingService = require('../services/meetingService'); // 테스트할 서비스
const ScheduleService = require('../services/scheduleService');
const ChatRooms = require('../models/ChatRooms');

beforeAll(async () => {
  await sequelize.sync({ force: true }); // 테스트 데이터베이스 초기화
});

beforeEach(async () => {
  // 각 테스트 전에 데이터베이스 초기화
  await sequelize.sync({ force: true });

  // 더미 사용자 생성 (ID 자동 증가)
  await User.create({ name: 'Alice', email: 'alice@example.com' });
  await User.create({ name: 'Bob', email: 'bob@example.com' });

  // 생성된 사용자 ID 가져오기
  const alice = await User.findOne({ where: { email: 'alice@example.com' } });
  const bob = await User.findOne({ where: { email: 'bob@example.com' } });

  // 사용자 ID를 테스트에서 사용하기 위해 저장
  global.aliceId = alice.id;
  global.bobId = bob.id;
});

afterAll(async () => {
  await sequelize.close(); // 테스트 후 Sequelize 연결 종료
});

describe('Meeting Service', () => {
  describe('createMeeting', () => {
    test('should create a new meeting successfully', async () => {
      // Arrange
      const meetingData = {
        title: '팀 동기화 미팅',
        description: '월간 팀 동기화 회의입니다.',
        time_idx_start: 40,
        time_idx_end: 42,
        location: '회의실 A',
        time_idx_deadline: 38,
        type: 'OPEN',
        created_by: global.aliceId,
      };

      // Mock ScheduleService.createSchedules가 성공적으로 동작하도록 설정
      ScheduleService.createSchedules.mockResolvedValue(true);

      // Act
      const result = await MeetingService.createMeeting(meetingData);

      // Assert
      expect(result).toHaveProperty('meeting_id');
      expect(result).toHaveProperty('chatRoomId');

      // ChatRooms가 올바르게 호출되었는지 확인
      expect(ChatRooms).toHaveBeenCalledWith({
        chatRoomId: expect.any(String),
        participants: ['Alice'],
        messages: [],
        lastReadAt: {},
        lastReadLogId: {},
        isOnline: {},
      });

      // ChatRooms 인스턴스의 save 메서드가 호출되었는지 확인
      const chatRoomInstance = ChatRooms.mock.instances[0];
      expect(chatRoomInstance).toBeDefined();
      expect(jest.isMockFunction(chatRoomInstance.save)).toBe(true);
      expect(chatRoomInstance.save).toHaveBeenCalled();

      // Meeting이 올바르게 생성되었는지 확인
      const createdMeeting = await Meeting.findOne({ where: { id: result.meeting_id } });
      expect(createdMeeting).toBeDefined();
      expect(createdMeeting.title).toBe('팀 동기화 미팅');

      // MeetingParticipant가 올바르게 생성되었는지 확인
      const participant = await MeetingParticipant.findOne({ where: { meeting_id: result.meeting_id, user_id: global.aliceId } });
      expect(participant).toBeDefined();
      expect(participant.user_id).toBe(global.aliceId);

      // ScheduleService.createSchedules가 올바르게 호출되었는지 확인
      expect(ScheduleService.createSchedules).toHaveBeenCalledWith(
        {
          userId: global.aliceId,
          title: '번개 모임: 팀 동기화 미팅',
          is_fixed: true,
          events: [{ time_idx: 40 }, { time_idx: 42 }],
        },
        expect.any(Object)
      );
    });

    test('should throw error when user does not exist', async () => {
      // Arrange
      const meetingData = {
        title: '팀 동기화 미팅',
        description: '월간 팀 동기화 회의입니다.',
        time_idx_start: 40,
        time_idx_end: 42,
        location: '회의실 A',
        time_idx_deadline: 38,
        type: 'OPEN',
        created_by: 9999, // 존재하지 않는 사용자 ID
      };

      // Act & Assert
      await expect(MeetingService.createMeeting(meetingData)).rejects.toThrow('사용자를 찾을 수 없습니다.');

      // Meeting이 생성되지 않았는지 확인
      const createdMeeting = await Meeting.findOne({ where: { title: '팀 동기화 미팅' } });
      expect(createdMeeting).toBeNull();

      // ChatRooms과 ScheduleService.createSchedules가 호출되지 않았는지 확인
      expect(ChatRooms).not.toHaveBeenCalled();
      expect(ScheduleService.createSchedules).not.toHaveBeenCalled();
    });

    // 나머지 테스트 케이스도 동일한 방식으로 수정
  });

  // 다른 테스트 케이스...
});
