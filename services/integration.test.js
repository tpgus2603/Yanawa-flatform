// test/integration.test.js
const sequelize = require('../config/sequelize');
const { User, Friend, Meeting, Schedule, MeetingParticipant, ChatRooms } = require('../models');
const FriendService = require('../services/friendService');
const MeetingService = require('../services/meetingService');
const ScheduleService = require('../services/scheduleService');

describe('System Integration Test', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });

    jest.spyOn(ChatRooms.prototype, 'save').mockResolvedValue(undefined);
    jest.spyOn(ChatRooms, 'findOne').mockResolvedValue({
      participants: [],
      isOnline: new Map(),
      lastReadAt: new Map(),
      lastReadLogId: new Map(),
      save: jest.fn().mockResolvedValue(true),
    });

    // 테스트용 사용자 생성
    await User.bulkCreate([
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' }
    ]);

    // 성능 측정을 위한 시작 시간 기록
    console.time('Complete User Journey');
  });

  afterAll(async () => {
    console.timeEnd('Complete User Journey');
    jest.restoreAllMocks();
    await sequelize.close();
  });

  /**
   * 시나리오 1
   * 1. 친구
   * 2. 스케줄 관리
   * 3. 미팅
   * 4. 조회
   */

  test('Complete User Journey Scenario', async () => {
    const pagination = { limit: 20, offset: 0 };
    /**
     * 1. 친구
     * 친구 요청/수락/거절
     * 친구 목록 조회
     * 중복 친구 요청 방지
     * ++ 친구 스케줄 보기
     */
    console.time('Friend Operations');
    const aliceId = 1, bobId = 2, charlieId = 3;

    await FriendService.sendFriendRequest(aliceId, bobId);
    await FriendService.sendFriendRequest(aliceId, charlieId);

    await FriendService.acceptFriendRequest(bobId, aliceId);
    await FriendService.rejectFriendRequest(charlieId, aliceId);

    const aliceFriends = await FriendService.getFriendList(aliceId, pagination);
    expect(aliceFriends.content.length).toBe(1);
    expect(aliceFriends.content[0].friendInfo.name).toBe('Bob');

    await expect(
      FriendService.sendFriendRequest(aliceId, bobId)
    ).rejects.toThrow('Friend request already exists');

    /**
     * 2. 스케줄 관리
     * 스케줄 생성/수정/삭제
     * 전체 스케줄 조회
     * 특정 스케줄 조회
     * ++ 페이지네이션 확인
     */
    console.time('Schedule Operations');

    // 2-1. 스케줄 생성
    const aliceSchedule = {
      userId: aliceId,
      title: '수업',
      is_fixed: true,
      events: [
        { time_idx: 36 },
        { time_idx: 37 },
        { time_idx: 38 }
      ]
    };
    const createdSchedules = await ScheduleService.createSchedules(aliceSchedule);
    expect(createdSchedules.length).toBe(3);

    // 2-2. 특정 스케줄 조회
    const specificSchedule = await ScheduleService.getScheduleByTimeIdx(aliceId, 36);
    expect(specificSchedule.title).toBe('수업');
    expect(specificSchedule.is_fixed).toBe(true);

    // 2-3. 전체 스케줄 조회
    const allSchedules = await ScheduleService.getAllSchedules(aliceId);
    expect(allSchedules.length).toBe(3);
    expect(allSchedules.every(s => s.title === '수업')).toBe(true);

    // 2-4. 스케줄 수정
    const scheduleUpdates = [
      { time_idx: 36, title: '중요 수업', is_fixed: true }
    ];
    const updatedSchedules = await ScheduleService.updateSchedules(aliceId, scheduleUpdates);
    expect(updatedSchedules[0].title).toBe('중요 수업');

    // 2-5. 수정된 스케줄 확인
    const updatedAllSchedules = await ScheduleService.getAllSchedules(aliceId);
    const updatedSchedule = updatedAllSchedules.find(s => s.time_idx === 36);
    expect(updatedSchedule.title).toBe('중요 수업');

    // 2-6. 스케줄 삭제
    const deleteResult = await ScheduleService.deleteSchedules(aliceId, [37]);
    expect(deleteResult.deleted_time_idxs).toContain(37);

    // 2-7. 삭제 확인
    const remainingSchedules = await ScheduleService.getAllSchedules(aliceId);
    expect(remainingSchedules.length).toBe(2);
    expect(remainingSchedules.every(s => s.time_idx !== 37)).toBe(true);

    // 2-8. 중복 스케줄 생성 시도
    await expect(
      ScheduleService.createSchedules({
        userId: aliceId,
        title: '중복 스케줄',
        is_fixed: true,
        events: [{ time_idx: 36 }]
      })
    ).rejects.toThrow('Schedule overlaps with existing schedule');

    console.timeEnd('Schedule Operations');


    /**
     * 3. 미팅 참가
     * 미팅 생성/스케줄 자동 등록 ++ create 시 생성자의 스케줄 확인 및 중복 체크
     * 중복된 시간 참여 불가
     * 미팅 close (생성자)
     * 미팅 탈퇴
     * ++ 친구 초대
     */
    jest.spyOn(MeetingService, 'getCurrentTimeIdx').mockReturnValue(30);

    /**
     * 3. 미팅 참가 시나리오
     */
    console.time('Meeting Operations');

    // 3-1. 미팅 생성 및 스케줄 자동 등록
    const meetingData = {
      title: '스터디 모임',
      time_idx_start: 36,
      time_idx_end: 38,
      created_by: bobId,
      type: 'OPEN',
      time_idx_deadline: 35,
      location: 'Room A'
    };

    const meeting = await MeetingService.createMeeting(meetingData);

    const bobSchedules = await Schedule.findAll({
      where: {
        user_id: bobId,
        title: `번개 모임: ${meetingData.title}`
      }
    });
    expect(bobSchedules.length).toBe(3); // 36-38 시간대

    // 3-2. 스케줄 충돌로 인한 참가 실패 (Alice)
    await expect(
      MeetingService.joinMeeting(meeting.meeting_id, aliceId)
    ).rejects.toThrow('스케줄이 겹칩니다');

    // 3-3. Charlie 참가 성공
    await MeetingService.joinMeeting(meeting.meeting_id, charlieId);
    const charlieSchedules = await Schedule.findAll({
      where: {
        user_id: charlieId,
        title: `번개 모임: ${meetingData.title}`
      }
    });
    expect(charlieSchedules.length).toBe(3);

    // 3-4. Charlie의 미팅 목록 조회
    const charlieMyMeetings = await MeetingService.getMyMeetings(charlieId, pagination);
    expect(charlieMyMeetings.content.length).toBe(1);
    expect(charlieMyMeetings.content[0].isParticipant).toBe(true);
    expect(charlieMyMeetings.content[0].title).toBe('스터디 모임');

    // 3-5. Charlie 미팅 탈퇴
    await MeetingService.leaveMeeting(meeting.meeting_id, charlieId);

    // 탈퇴 후 스케줄 삭제 확인
    const remainingCharlieSchedules = await Schedule.findAll({
      where: {
        user_id: charlieId,
        title: `번개 모임: ${meetingData.title}`
      }
    });
    expect(remainingCharlieSchedules.length).toBe(0);

    // 탈퇴 후 미팅 목록 확인
    const charlieMyMeetingsAfterLeave = await MeetingService.getMyMeetings(charlieId, pagination);
    expect(charlieMyMeetingsAfterLeave.content.length).toBe(0);

    // 3-6. 생성자 탈퇴 시도 (실패)
    await expect(
      MeetingService.leaveMeeting(meeting.meeting_id, bobId)
    ).rejects.toThrow('모임 생성자는 탈퇴할 수 없습니다');

    // 3-7. 미팅 마감
    await MeetingService.closeMeeting(meeting.meeting_id);
    const closedMeeting = await Meeting.findByPk(meeting.meeting_id);
    expect(closedMeeting.type).toBe('CLOSE');

    // 3-8. 마감된 미팅 참가 시도 (실패)
    await expect(
      MeetingService.joinMeeting(meeting.meeting_id, charlieId)
    ).rejects.toThrow('이미 마감된 모임입니다');

    /**
     * 4. 미팅 조회 시나리오
     * 전체 미팅 목록 조회
     * 참여하고 있는 미팅 목록 조회
     * 상세 정보 조회
     */
    console.time('Meeting Queries');

    // 4-1. 전체 미팅 목록 조회
    const allMeetings = await MeetingService.getMeetings(aliceId, pagination);
    expect(allMeetings.content.length).toBe(1);
    expect(allMeetings.content[0].isScheduleConflict).toBe(true);

    // 4-2. Bob의 미팅 목록 조회 (생성자)
    const bobMyMeetings = await MeetingService.getMyMeetings(bobId, pagination);
    expect(bobMyMeetings.content.length).toBe(1);
    expect(bobMyMeetings.content[0].isParticipant).toBe(true);
    expect(bobMyMeetings.content[0].creatorName).toBe('Bob');

    // 4-2. Alice의 미팅 목록 조회 (참여 x, 생성 x)
    const aliceMyMeetings = await MeetingService.getMyMeetings(aliceId, pagination);
    expect(aliceMyMeetings.content.length).toBe(0);
    // expect(aliceMyMeetings.content[0].isParticipant).toBe(true);
    // expect(aliceMyMeetings.content[0].creatorName).toBe('Bob');

    // 4-3. 상세 정보 조회
    const meetingDetail = await MeetingService.getMeetingDetail(meeting.meeting_id, aliceId);
    expect(meetingDetail.isScheduleConflict).toBe(true);
    expect(meetingDetail.creatorName).toBe('Bob');
    expect(meetingDetail.participants).toBeDefined();

    console.timeEnd('Meeting Queries');

  }, 10000);
});
