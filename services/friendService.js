// services/friendService.js

const { Op } = require('sequelize');
const { Friend,User} = require('../models');
const sequelize = require('../config/sequelize');

// DTO 임포트
const FriendResponseDTO = require('../dtos/FriendResponseDTO');
const FriendListDTO = require('../dtos/FriendListDTO');

class FriendService {
    /**
     * User 존재 여부 유효성 검사
     * userId - 검사할 사용자 ID
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
     * userId - 친구 요청을 보내는 사용자 ID
     * friendId - 친구 요청을 받는 사용자 ID
     * returns - 생성된 친구 요청 DTO
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

            

            return new FriendResponseDTO(friendRequestWithDetails.toJSON());
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Friend request already exists');
            }
            throw error;
        }
    }

    /**
     * 받은 친구 요청 목록 조회
      userId - 요청을 받은 사용자 ID
     받은 친구 요청 목록 DTO 배열
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

        return receivedRequests.map(req => new FriendResponseDTO(req));
    }

    /**
     * 보낸 친구 요청 목록 조회
     * userId - 요청을 보낸 사용자 ID
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

        return sentRequests.map(req => new FriendResponseDTO(req));
    }

    /**
     * 친구 요청 수락
     * @param {number} userId - 요청을 수락하는 사용자 ID
     * @param {number} friendId - 친구 요청을 보낸 사용자 ID
     * @returns {Promise<FriendResponseDTO>} - 업데이트된 친구 요청 DTO
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

            return new FriendResponseDTO(updatedRequest);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * 친구 요청 거절
     *userId - 요청을 거절하는 사용자 ID
     *  friendId - 친구 요청을 보낸 사용자 ID
     * returns  - 삭제된 친구 요청 수
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
     userId - 친구 목록을 조회할 사용자 ID
     limit - 한 페이지에 표시할 친구 수
     offset - 페이징 오프셋
     친구 목록 DTO 배열
     */
    async getFriendList(userId, pagination) {
        const { limit = 20, offset = 0 } = pagination;
    
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
            limit: limit + 1, 
            offset
        });
    
        const hasNext = friends.length > limit;
        const content = friends.slice(0, limit).map(friend => new FriendListDTO(friend, userId));
    
        return {
            content,
            page: offset / limit,
            size: limit,
            hasNext
        };
    }

    /**
     * 친구 삭제
     - 친구를 삭제하는 사용자 ID
     - 삭제할 친구의 사용자 ID
     - 삭제된 친구 관계 수
     -친구 관계가 존재하지 않을 경우
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
