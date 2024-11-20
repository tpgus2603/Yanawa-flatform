// services/friendService.js

const { Op } = require('sequelize');
const Friend = require('../models/Friend');
const User = require('../models/User');
const sequelize = require('../config/sequelize');

// DTO 임포트
const FriendRequestDTO = require('../dtos/FriendRequestDTO');
const FriendListDTO = require('../dtos/FriendListDTO');

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
     * @returns {Promise<FriendRequestDTO>} - 생성된 친구 요청 DTO
     * @throws {Error} - 유효하지 않은 요청일 경우
     */
    async sendFriendRequest(userId, friendId) {
        await this.validUser(userId);
        await this.validUser(friendId);

        if (userId === friendId) {
            throw new Error('Cannot send friend request to yourself');
        }

        // 기존 친구 관계 확인 (이미 친구인 경우)
        const existingFriend = await Friend.findOne({
            where: {
                [Op.or]: [
                    { requester_id: userId, receiver_id: friendId },
                    { requester_id: friendId, receiver_id: userId },
                ],
                status: 'ACCEPTED',
            },
        });

        if (existingFriend) {
            throw new Error('Friend request already exists');
        }

        try {
            const friendRequest = await Friend.create({
                requester_id: userId,
                receiver_id: friendId,
                status: 'PENDING'
            });

            // DTO로 변환하여 반환
            const friendRequestWithDetails = await Friend.findByPk(friendRequest.id, {
                include: [
                    { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'receiver', attributes: ['id', 'name', 'email'] }
                ]
            });

            

            return new FriendRequestDTO(friendRequestWithDetails.toJSON());
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
     * @returns {Promise<Array<FriendRequestDTO>>} - 받은 친구 요청 목록 DTO 배열
     */
    async getReceivedRequests(userId) {
        const receivedRequests = await Friend.findAll({
            where: {
                receiver_id: userId,
                status: 'PENDING'
            },
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'receiver', attributes: ['id', 'name', 'email'] } // 추가
            ]
        });

        return receivedRequests.map(req => new FriendRequestDTO(req));
    }

    /**
     * 보낸 친구 요청 목록 조회
     * @param {number} userId - 요청을 보낸 사용자 ID
     * @returns {Promise<Array<FriendRequestDTO>>} - 보낸 친구 요청 목록 DTO 배열
     */
    async getSentRequests(userId) {
        const sentRequests = await Friend.findAll({
            where: {
                requester_id: userId,
                status: 'PENDING'
            },
            include: [
                { model: User, as: 'receiver', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] } // 추가
            ]
        });

        return sentRequests.map(req => new FriendRequestDTO(req));
    }

    /**
     * 친구 요청 수락
     * @param {number} userId - 요청을 수락하는 사용자 ID
     * @param {number} friendId - 친구 요청을 보낸 사용자 ID
     * @returns {Promise<FriendRequestDTO>} - 업데이트된 친구 요청 DTO
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

            // DTO로 변환하여 반환
            const updatedRequest = await Friend.findByPk(request.id, {
                include: [
                    { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'receiver', attributes: ['id', 'name', 'email'] }
                ]
            });

            return new FriendRequestDTO(updatedRequest);
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
     * @param {number} limit - 한 페이지에 표시할 친구 수
     * @param {number} offset - 페이징 오프셋
     * @returns {Promise<Array<FriendListDTO>>} - 친구 목록 DTO 배열
     */
    async getFriendList(userId, limit = 20, offset = 0) {
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
            ],
            order: [['id', 'ASC']], 
            limit,
            offset
        });


        return friends.map(friend => new FriendListDTO(friend, userId));
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
