// test/friendService.test.js

const sequelize = require('../config/sequelize'); // Sequelize 인스턴스 임포트
// const User = require('../models/User');
// const Friend = require('../models/Friend');
const { Friend,User} = require('../models');
const friendService = require('./friendService'); // FriendService 임포트

// Sequelize의 Op를 가져오기 위해 추가
const { Op } = require('sequelize');

beforeAll(async () => {
    await sequelize.sync({ force: true });
});

beforeEach(async () => {
    await sequelize.sync({ force: true });

    // 더미 사용자 생성
    await User.bulkCreate([
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    ]);
});

afterAll(async () => {
    
    await sequelize.close();
});

describe('Friend Service', () => {
    describe('validUser', () => {
        test('should return user when user exists', async () => {
            const user = await friendService.validUser(1);
            expect(user).toBeDefined();
            expect(user.name).toBe('Alice');
        });

        test('should throw error when user does not exist', async () => {
            await expect(friendService.validUser(999)).rejects.toThrow('User not found');
        });
    });

    describe('sendFriendRequest', () => {
        test('should send a friend request successfully', async () => {
            const friendRequestDTO = await friendService.sendFriendRequest(1, 3); // Alice sends request to Charlie
            console.log('sendFriendRequest DTO:', friendRequestDTO); // 디버깅을 위한 로그 추가
            expect(friendRequestDTO).toBeDefined();
            expect(friendRequestDTO.requester.id).toBe(1); 
            expect(friendRequestDTO.receiver.id).toBe(3); 
            expect(friendRequestDTO.status).toBe('PENDING');
        });

        test('should throw error when sending friend request to self', async () => {
            await expect(friendService.sendFriendRequest(1, 1)).rejects.toThrow('Cannot send friend request to yourself');
        });

        test('should throw error when sending duplicate friend request', async () => {
            await friendService.sendFriendRequest(1, 2);
            await friendService.acceptFriendRequest(2, 1);
            await expect(friendService.sendFriendRequest(1, 2)).rejects.toThrow('Friend request already exists');
        });

        test('should throw error when user does not exist', async () => {
            await expect(friendService.sendFriendRequest(1, 999)).rejects.toThrow('User not found');
            await expect(friendService.sendFriendRequest(999, 1)).rejects.toThrow('User not found');
        });
    });

    describe('getReceivedRequests', () => {
        test('friend requests', async () => {
            await friendService.sendFriendRequest(3, 1);

            const receivedRequests = await friendService.getReceivedRequests(1);
            expect(receivedRequests.length).toBe(1);
            expect(receivedRequests[0].requester.name).toBe('Charlie');
        });

        test('not send request', async () => {
            const receivedRequests = await friendService.getReceivedRequests(2); 
            expect(receivedRequests.length).toBe(0);
        });
    });

    describe('getSentRequests', () => {
        test('should retrieve sent friend requests', async () => {
            await friendService.sendFriendRequest(1, 3);

            const sentRequests = await friendService.getSentRequests(1);
            expect(sentRequests.length).toBe(1);
            expect(sentRequests[0].receiver.name).toBe('Charlie');
        });

        test('should return empty array when no sent requests', async () => {
            const sentRequests = await friendService.getSentRequests(3); 
            expect(sentRequests.length).toBe(0);
        });
    });

    describe('acceptFriendRequest', () => {
        test('should accept a pending friend request successfully', async () => {
            await friendService.sendFriendRequest(3, 1);

            const updatedRequestDTO = await friendService.acceptFriendRequest(1, 3);
            expect(updatedRequestDTO).toBeDefined();
            expect(updatedRequestDTO.status).toBe('ACCEPTED');

            // Db상태 확인
            const request = await Friend.findOne({
                where: {
                    requester_id: 3,
                    receiver_id: 1,
                },
            });
            expect(request.status).toBe('ACCEPTED');
        });

        test('should throw error when accepting non-existing friend request', async () => {
            await expect(friendService.acceptFriendRequest(1, 999)).rejects.toThrow('Friend request not found');
        });
    });

    describe('rejectFriendRequest', () => {
        test('should reject a pending friend request successfully', async () => {
            await friendService.sendFriendRequest(2, 3);

            const result = await friendService.rejectFriendRequest(3, 2);
            expect(result).toBe(1);

            const request = await Friend.findOne({
                where: {
                    requester_id: 2,
                    receiver_id: 3,
                },
            });
            expect(request).toBeNull();
        });

        test('should throw error when rejecting non-existing friend request', async () => {
            await expect(friendService.rejectFriendRequest(1, 999)).rejects.toThrow('Friend request not found');
        });
    });

    describe('getFriendList', () => {
        beforeEach(async () => {
            await friendService.sendFriendRequest(1, 2);
            await friendService.acceptFriendRequest(2, 1);
            await friendService.sendFriendRequest(1, 3);
            await friendService.acceptFriendRequest(3, 1);
    
            // 추가 더미데이터 생성
            for (let i = 4; i <= 23; i++) {
                await User.create({
                    id: i,
                    name: `User${i}`,
                    email: `user${i}@example.com`,
                });
                await friendService.sendFriendRequest(1, i);
                await friendService.acceptFriendRequest(i, 1);
            }
        });
    
        test('작은 size로 여러 페이지 조회', async () => {
            const size = 10;
            
            // 첫 페이지
            const page1 = await friendService.getFriendList(1, {
                limit: size,
                offset: 0
            });
            expect(page1.content.length).toBe(size);
            expect(page1.hasNext).toBe(true);
            
            // 두 번째 페이지
            const page2 = await friendService.getFriendList(1, {
                limit: size,
                offset: size
            });
            expect(page2.content.length).toBe(size);
            expect(page2.hasNext).toBe(true);
            
            // 마지막 페이지
            const page3 = await friendService.getFriendList(1, {
                limit: size,
                offset: size * 2
            });
            expect(page3.content.length).toBe(2);
            expect(page3.hasNext).toBe(false);
        });
    
        test('페이지 순서 검증', async () => {
            const size = 5;
            const page1 = await friendService.getFriendList(1, {
                limit: size,
                offset: 0
            });
            const page2 = await friendService.getFriendList(1, {
                limit: size,
                offset: size
            });
    
            const names1 = page1.content.map(friend => friend.friendInfo.name);
            const names2 = page2.content.map(friend => friend.friendInfo.name);
    
            expect(names1).toEqual(['Bob', 'Charlie', 'User4', 'User5', 'User6']);
            expect(names2).toEqual(['User7', 'User8', 'User9', 'User10', 'User11']);
        });
    
        test('존재하지 않는 페이지 조회', async () => {
            const response = await friendService.getFriendList(1, {
                limit: 20,
                offset: 100
            });
            expect(response.content).toHaveLength(0);
            expect(response.hasNext).toBe(false);
        });
    });

    describe('deleteFriend', () => {
        test('should delete an existing friend relationship successfully', async () => {
            await friendService.sendFriendRequest(1, 2);
            await friendService.acceptFriendRequest(2, 1);

            const result = await friendService.deleteFriend(1, 2);
            expect(result).toBe(1);

            const relationship = await Friend.findOne({
                where: {
                    [Op.or]: [
                        { requester_id: 1, receiver_id: 2 },
                        { requester_id: 2, receiver_id: 1 },
                    ],
                    status: 'ACCEPTED',
                },
            });
            expect(relationship).toBeNull();
        });

        test('should throw error when deleting a non-existing friend relationship', async () => {
            await expect(friendService.deleteFriend(1, 999)).rejects.toThrow('Friend relationship not found');
        });
    });
});
