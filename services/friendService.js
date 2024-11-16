const { Op } = require('sequelize');
const Friend = require('../models/Friend');
const User = require('../models/user');

class friendService {
    
    /**
     * 친구 요청 보내기
     * 나 자신에게 보내기 or 이미 존재하는 친구 -> X
     * 이후, PENDING 상태로 변환 -> 수락/거절에 따라 변화
     */
    async sendFriendRequest(userId, friendId) {
        if (userId === friendId) {
            throw new Error('Cannot send friend request to yourself');
        }

        const existingFriend = await Friend.findOne({
            where: {
                [Op.or]: [
                    { user_id: userId, friend_id: friendId },
                    { user_id: friendId, friend_id: userId }
                ]
            }
        });

        if (existingFriend) {
            throw new Error('Friend request already exists');
        }

        return Friend.create({
            user_id: userId,
            friend_id: friendId,
            status: 'PENDING'
        });
    }

    /**
     * 받은 친구 요청 목록 조회
     */
    async getReveivedRequests(userId) {
        return Friend.findAll({
            where: {
                friend_id: userId,
                status: 'PENDING'
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }]
        });
    }

    /**
     * 친구 요청 수락
     */
    async acceptFriendRequest(requestId, userId) {
        const request = await Friend.findOne({
            where: {
                id: requestId,
                friend_id: userId,
                status: 'PENDING'
            }
        });

        if (!request) {
            throw new Error('Friend reqeust not found');
        }

        return request.update({ status: 'ACCEPTED '});
    }
    
}

module.exports = new FriendService();