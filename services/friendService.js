// services/friendService.js

const { Op } = require('sequelize');
const Friend = require('../models/Friend');
const User = require('../models/User');
const sequelize = require('../config/sequelize'); // 트랜잭션을 위해 추가

class FriendService {
    /**
     * User 존재 여부 유효성 검사
     * @param {number} userId - 검사할 사용자 ID
     * @returns {Promise<User>} - 유효한 사용자 객체
     * @throws {Error} - 사용자가 존재하지 않을 경우
     */
    async validUser(userId) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    /**
     * 친구 요청 보내기
     * @param {number} userId - 친구 요청을 보내는 사용자 ID
     * @param {number} friendId - 친구 요청을 받는 사용자 ID
     * @returns {Promise<Friend>} - 생성된 친구 요청 객체
     * @throws {Error} - 유효하지 않은 요청일 경우
     */
    async sendFriendRequest(userId, friendId) {
        await this.validUser(userId);
        await this.validUser(friendId);

        if (userId === friendId) {
            throw new Error('Cannot send friend request to yourself');
        }

        try {
            return await Friend.create({
                requester_id: userId,
                receiver_id: friendId,
                status: 'PENDING'
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Friend request already exists');
            }
            throw error;
        }
    }

    /**
     * 받은 친구 요청 목록 조회
     * @param {number} userId - 요청을 받은 사용자 ID
     * @returns {Promise<Array>} - 받은 친구 요청 목록
     */
    async getReceivedRequests(userId) {
        return Friend.findAll({
            where: {
                receiver_id: userId,
                status: 'PENDING'
            },
            include: [{
                model: User,
                as: 'requester',
                attributes: ['id', 'name', 'email']
            }]
        });
    }

    /**
     * 보낸 친구 요청 목록 조회
     * @param {number} userId - 요청을 보낸 사용자 ID
     * @returns {Promise<Array>} - 보낸 친구 요청 목록
     */
    async getSentRequests(userId) {
        return Friend.findAll({
            where: {
                requester_id: userId,
                status: 'PENDING'
            },
            include: [{
                model: User,
                as: 'receiver',
                attributes: ['id', 'name', 'email']
            }]
        });
    }

    /**
     * 친구 요청 수락
     * @param {number} userId - 요청을 수락하는 사용자 ID
     * @param {number} friendId - 친구 요청을 보낸 사용자 ID
     * @returns {Promise<Friend>} - 업데이트된 친구 요청 객체
     * @throws {Error} - 친구 요청이 존재하지 않을 경우
     */
    async acceptFriendRequest(userId, friendId) {
        const transaction = await sequelize.transaction();
        try {
            const request = await Friend.findOne({
                where: {
                    requester_id: friendId,
                    receiver_id: userId,
                    status: 'PENDING'
                },
                transaction
            });

            if (!request) {
                throw new Error('Friend request not found');
            }

            await request.update({ status: 'ACCEPTED' }, { transaction });

            await transaction.commit();
            return request;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * 친구 요청 거절
     * @param {number} userId - 요청을 거절하는 사용자 ID
     * @param {number} friendId - 친구 요청을 보낸 사용자 ID
     * @returns {Promise<number>} - 삭제된 친구 요청 수
     * @throws {Error} - 친구 요청이 존재하지 않을 경우
     */
    async rejectFriendRequest(userId, friendId) {
        const result = await Friend.destroy({
            where: {
                requester_id: friendId,
                receiver_id: userId,
                status: 'PENDING'
            }
        });

        if (!result) {
            throw new Error('Friend request not found');
        }

        return result;
    }

    /**
     * 친구 목록 조회
     * @param {number} userId - 친구 목록을 조회할 사용자 ID
     * @returns {Promise<Array>} - 친구 목록
     */
    async getFriendList(userId) {
        const friends = await Friend.findAll({
            where: {
                [Op.or]: [
                    { requester_id: userId },
                    { receiver_id: userId }
                ],
                status: 'ACCEPTED'
            },
            include: [
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        return friends.map(friend => {
            const isRequester = friend.requester_id === userId;
            const friendInfo = isRequester ? friend.receiver : friend.requester;

            return {
                id: friend.id,
                status: friend.status,
                createdAt: friend.createdAt,
                updatedAt: friend.updatedAt,
                friendInfo: friendInfo,
                relationshipType: isRequester ? 'sent' : 'received'
            };
        });
    }

    /**
     * 친구 삭제
     * @param {number} userId - 친구를 삭제하는 사용자 ID
     * @param {number} friendId - 삭제할 친구의 사용자 ID
     * @returns {Promise<number>} - 삭제된 친구 관계 수
     * @throws {Error} - 친구 관계가 존재하지 않을 경우
     */
    async deleteFriend(userId, friendId) {
        const result = await Friend.destroy({
            where: {
                [Op.or]: [
                    { requester_id: userId, receiver_id: friendId },
                    { requester_id: friendId, receiver_id: userId }
                ],
                status: 'ACCEPTED'
            }
        });

        if (!result) {
            throw new Error('Friend relationship not found');
        }
        return result;
    }
}

module.exports = new FriendService();
