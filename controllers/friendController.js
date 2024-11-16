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
}

module.exports = new friendController();