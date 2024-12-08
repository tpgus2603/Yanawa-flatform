const FriendService = require('../services/friendService');
const { User } = require('../models');
const performanceMonitor = require('../utils/performanceMonitor');

class friendController {
    /**
     * 친구 요청 보내기
     * 클라이언트는 userId와 요청을 보낼 사용자의 email을 전송
     * POST /api/friend/request
     * 
     */
    async sendFriendRequest(req, res) {
        try {
            return await performanceMonitor.measureAsync('sendFriendRequest', async () => {
                const { email }  = req.body;
                const userId = req.user.id;

                if (!userId || !email) {
                    throw new Error('userId와 email은 필수 입력 항목입니다.');
                }

                const receiver = await User.findOne({ where: { email } });
                if (!receiver) {
                    throw new Error('요청을 받을 사용자를 찾을 수 없습니다.');
                }

                const friendRequest = await FriendService.sendFriendRequest(userId, receiver.id);
                return res.status(201).json({
                    success: true,
                    data: friendRequest
                });
            });
        } catch (error) {
            return res.status(error.status || 500).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'FRIEND_REQUEST_ERROR'
                }
            });
        }
    }

    /**
     * 받은 친구 요청 목록 조회
     * GET /api/friend/requests/received
     */
    async getReceivedRequests(req, res) {
        try {
            return await performanceMonitor.measureAsync('getReceivedRequests', async () => {
                const userId = req.user.id;
                const requests = await FriendService.getReceivedRequests(userId);
                return res.status(200).json({
                    success: true,
                    data: requests
                });
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'FETCH_ERROR'
                }
            });
        }
    }

    /**
     * 보낸 친구 요청 목록 조회
     * GET /api/friend/requests/sent
     */
    async getSentRequests(req, res) {
        try {
            return await performanceMonitor.measureAsync('getSentRequests', async () => {
                const userId = req.user.id;
                const requests = await FriendService.getSentRequests(userId);
                return res.status(200).json({
                    success: true,
                    data: requests
                });
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'FETCH_ERROR'
                }
            });
        }
    }
    /**
     * 친구 요청 수락
     * POST /api/friend/request/:friendId/accept
     */
    async acceptRequest(req, res) {
        try {
            return await performanceMonitor.measureAsync('acceptFriendRequest', async () => {
                if (!req.user || !req.user.id) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            message: '인증되지 않은 사용자입니다.',
                            code: 'UNAUTHORIZED'
                        }
                    });
                }
    
                const userId = req.user.id;
                const friendId = parseInt(req.params.friendId, 10);
    
                if (!friendId || isNaN(friendId)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: '유효하지 않은 친구 ID입니다.',
                            code: 'INVALID_FRIEND_ID'
                        }
                    });
                }
    
                const result = await FriendService.acceptFriendRequest(userId, friendId);
                return res.status(200).json({
                    success: true,
                    data: result
                });
            });
        } catch (error) {
            console.error('Friend request accept error:', error);
            return res.status(400).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'REQUEST_ACCEPT_ERROR'
                }
            });
        }
    }

    /**
     * 친구 요청 거절
     * POST /api/friend/request/:friendId/reject
     */
    async rejectRequest(req, res) {
        try {
            return await performanceMonitor.measureAsync('rejectFriendRequest', async () => {
                const userId = req.user.id;
                const { friendId } = req.params;

                const result = await FriendService.rejectFriendRequest(userId, friendId);
                return res.status(200).json({
                    success: true,
                    data: result
                });
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'REQUEST_REJECT_ERROR'
                }
            });
        }
    }

    /**
     * 친구 목록 조회
     * GET /api/friend/all?page=1&size=20
     */
    async getFriendList(req, res) {
        try {
            return await performanceMonitor.measureAsync('getFriendList', async () => {
                const userId = req.user.id;
                const page = parseInt(req.query.page) || 0;
                const size = parseInt(req.query.size) || 20;

                const friends = await FriendService.getFriendList(userId, {
                    limit: size,
                    offset: page * size
                });

                return res.status(200).json({
                    success: true,
                    data: {
                        ...friends
                    }
                });
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'FETCH_ERROR'
                }
            });
        }
    }

    /**
     * 친구 삭제
     * DELETE /api/friend/:friendId
     */
    async deleteFriend(req, res) {
        try {
            return await performanceMonitor.measureAsync('deleteFriend', async () => {
                const userId = req.user.id;
                const { friendId } = req.params;

                const result = await FriendService.deleteFriend(userId, friendId);
                return res.status(200).json({
                    success: true,
                    data: {
                        message: 'Friend deleted successfully',
                        result: result
                    }
                });
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    message: error.message,
                    code: 'FRIEND_DELETE_ERROR'
                }
            });
        }
    }
}

module.exports = new friendController();