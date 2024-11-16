const FriendService = require('../services/friendService');

class friendController {
    /**
     * 친구 요청 보내기
     * POST /api/friend/request
     */
    async sendRequest(req, res) {
        try {
            const userId = req.user.id;
            const { friendId } = req.body;

            const request = await FriendService.sendFriendRequest(userId, friendId);
            return res.status(201).json({
                success: true,
                data: request
            });
        } catch (error) {
            return res.status(400).json({
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
            const userId = req.user.id;
            const requests = await FriendService.getReceivedRequests(userId);

            return res.status(200).json({
                success: true,
                data: requests
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
            const userId = req.user.id;
            const requests = await FriendService.getSentRequests(userId);

            return res.status(200).json({
                success: true,
                data: requests
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
     * POST /api/friend/request/:requestId/accept
     */
    async acceptRequest(req, res) {
        try {
            const userId = req.user.id;
            const { requestId } = req.params;

            const result = await FriendService.acceptFriendRequest(requestId, userId);

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
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
     * POST /api/friend/request/:requestId/reject
     */
    async rejectRequest(req, res) {
        try {
            const userId = req.user.id;
            const { requesId } = req.params;

            const result = await FriendService.rejectFriendRequest(requesId, userId);

            return res.status(200).json({
                success: true,
                data: result
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
     * GET /api/friend/all
     */
    async getFriendList(req, res) {
        try {
            const userId = req.user.id;
            const friends = await FriendService.getFriendList(userId);

            return res.status(200).json({
                success: true,
                data: friends
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