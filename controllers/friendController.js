const FriendService = require('../services/friendService');
const { User } = require('../models');

class friendController {
        /**
         * 친구 요청 보내기
         * 클라이언트는 userId와 요청을 보낼 사용자의 email을 전송
         */
        async sendFriendRequest(req, res, next) {
            const { userId, email } = req.body;
    
            try {

                if (!userId || !email) {
                    return res.status(400).json({ message: 'userId와 email은 필수 입력 항목입니다.' });
                }
                // 친구 요청을 받을 사용자의 정보 조회 (서비스로 분리할지 생각)
                const receiver = await User.findOne({ where: { email: email } });
                if (!receiver) {
                    return res.status(404).json({ message: '요청을 받을 사용자를 찾을 수 없습니다.' });
                }
                const friendId = receiver.id;
                // 친구 요청 보내기 서비스 호출
                const friendRequest = await FriendService.sendFriendRequest(userId, friendId);
                return res.status(201).json({
                    success:true,
                    data:friendRequest
                });
            } catch (error) {
                // 유니크 제약조건 오류 처리
                if (error.message === 'Friend request already exists') {
                    return res.status(409).json({ message: error.message });
                }

                // 일반 오류 처리
                return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
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
     * POST /api/friend/request/:friendId/accept
     */
    async acceptRequest(req, res) {
        try {
            const userId = req.user.id;
            const { friendId } = req.params;

            const result = await FriendService.acceptFriendRequest(userId, friendId);

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
     * POST /api/friend/request/:friendId/reject
     */
    async rejectRequest(req, res) {
        try {
            const userId = req.user.id;
            const { friendId } = req.params;

            const result = await FriendService.rejectFriendRequest(userId, friendId);

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
     * GET /api/friend/all?page=1&size=20
     */
    async getFriendList(req, res) {
        try {
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
                    content: friends,
                    page: page,
                    size: size,
                    hasNext: friends.length === size 
                }
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