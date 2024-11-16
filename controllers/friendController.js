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
}

module.exports = new friendController();