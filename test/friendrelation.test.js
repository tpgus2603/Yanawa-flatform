// test/friend.test.js

const sequelize = require('../config/sequelize'); // 환경 변수에 따라 다른 인스턴스 사용
const User = require('../models/User');
const Friend = require('../models/Friend');

beforeAll(async () => {
  // 데이터베이스 동기화
  await sequelize.sync({ force: true });

  // 더미 사용자 생성
  await User.bulkCreate([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ]);

  // 더미 친구 관계 생성
  await Friend.create({
    id: 1,
    requester_id: 1,
    receiver_id: 2,
    status: 'ACCEPTED',
  });
});

afterAll(async () => {
  // 데이터베이스 연결 종료
  await sequelize.close();//sequelize.close(): 테스트가 끝난 후 데이터베이스 연결을 종료하여 리소스를 해제
});

describe('User and Friend Relationships', () => {
  test('relation mapping test ', async () => {
    // 사용자 Alice의 보낸 친구 요청 조회
    const alice = await User.findByPk(1, {
      include: {
        model: Friend,
        as: 'sentRequests',
        include: {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
        },
      },
    });

    expect(alice.sentRequests.length).toBe(1);
    expect(alice.sentRequests[0].receiver.name).toBe('Bob');

    // 사용자 Bob의 받은 친구 요청 조회
    const bob = await User.findByPk(2, {
      include: {
        model: Friend,
        as: 'receivedRequests',
        include: {
          model: User,
          as: 'requester',
          attributes: ['id', 'name', 'email'],
        },
      },
    });

    expect(bob.receivedRequests.length).toBe(1);
    expect(bob.receivedRequests[0].requester.name).toBe('Alice');
  });

  test('create friend', async () => {
    // 새로운 친구 요청 생성
    const newFriendRequest = await Friend.create({
      id: 2,
      requester_id: 2,
      receiver_id: 1,
      status: 'PENDING',
    });

    expect(newFriendRequest.requester_id).toBe(2);
    expect(newFriendRequest.receiver_id).toBe(1);
    expect(newFriendRequest.status).toBe('PENDING');

    // 사용자 Bob의 보낸 친구 요청 조회
    const bob = await User.findByPk(2, {
      include: {
        model: Friend,
        as: 'sentRequests',
        where: { id: 2 },
        include: {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
        },
      },
    });

    expect(bob.sentRequests.length).toBe(1);
    expect(bob.sentRequests[0].receiver.name).toBe('Alice');
  });

  test('already request test', async () => {
    // Alice가 Bob에게 이미 친구 요청을 보냈으므로, 다시 보내면 에러 발생
    await expect(
      Friend.create({
        id: 4,
        requester_id: 1,
        receiver_id: 2,
        status: 'PENDING',
      })
    ).rejects.toThrow();
  });

  test('should accept a pending friend request correctly', async () => {
    // Bob이 Alice에게 보낸 친구 요청을 'ACCEPTED' 상태로 변경
    const friendRequest = await Friend.findOne({ where: { id: 2 } });
    expect(friendRequest.status).toBe('PENDING');
  
    friendRequest.status = 'ACCEPTED';
    await friendRequest.save();
  
    const updatedRequest = await Friend.findOne({ where: { id: 2 } });
    expect(updatedRequest.status).toBe('ACCEPTED');
  });


});
