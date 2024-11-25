// controllers/meetingController.js
const MeetingService = require('../services/meetingService');
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');

class MeetingController {
    /**
     * 번개 모임 생성
     * POST /api/meetings
     * 
     * 프론트엔드 입력 데이터 형식 예시:
     * {
     *     "title": "팀 동기화 미팅",
     *     "description": "월간 팀 동기화 회의입니다.",
     *     "time_idx_start": 40, // 예: 10:00 AM
     *     "time_idx_end": 42,   // 예: 10:30 AM
     *     "location": "회의실 A",
     *     "deadline": "2024-04-25T23:59:59Z",
     *     "type": "OPEN" // "OPEN" 또는 "CLOSE"
     * }
     */
    async createMeeting(req, res) {
        try {
            const userId = req.user.id;
            const meetingData = {
                ...req.body,
                created_by: userId
            };
            const createMeetingDTO = new CreateMeetingRequestDTO(meetingData);
            createMeetingDTO.validate();

            const result = await MeetingService.createMeeting(meetingData);
            res.status(201).json(result);
        } catch (err) {
            console.error('번개 모임 생성 오류:', err);
            res.status(500).json({ error: err.message || '번개 모임 생성 실패' });
        }
    }

    /**
     * 번개 모임 목록 조회
     * GET /api/meetings
     */
    async getMeetings(req, res) {
        try {
            const userId = req.user.id; // 인증 미들웨어를 통해 설정된 사용자 ID
            const page = parseInt(req.query.page) || 0;
            const size = parseInt(req.query.size) || 20;

            const meetings = await MeetingService.getMeetings(userId, {
                limit: size,
                offset: page * size
            });

            res.status(200).json({
                success: true,
                data: {
                    content: meetings.content,
                    page: page,
                    size: size,
                    hasNext: meetings.hasNext
                }
            });
        } catch (err) {
            console.error('모임 목록 조회 오류:', err);
            res.status(500).json({ error: err.message || '모임 목록 조회 실패' });
        }
    }

    /**
     * 번개 모임 마감
     * PATCH /api/meetings/:meetingId/close (URL 파라미터로 meetingId 전달)
     */
    async closeMeeting(req, res) {
        const { meetingId } = req.params;
        try {
            const meeting = await MeetingService.closeMeeting(meetingId);
            res.status(200).json({ message: '모임이 마감되었습니다.', meeting });
        } catch (err) {
            console.error('모임 마감 오류:', err);
            res.status(500).json({ error: err.message || '모임 마감 실패' });
        }
    }

    /**
     * 번개 모임 참가
     * POST /api/meetings/:meetingId/join
     *  (URL 파라미터로 meetingId 전달)
     */
    async joinMeeting(req, res) {
        try {
            const { meetingId } = req.params;
            const userId = req.user.id; // 인증 미들웨어를 통해 설정된 사용자 ID

            await MeetingService.joinMeeting(meetingId, userId);

            res.status(200).json({ message: '모임 및 채팅방 참가 완료' });
        } catch (err) {
            console.error('모임 참가 오류:', err);
            res.status(500).json({ error: err.message || '모임 참가 실패' });
        }
    }

    /**
     * 번개 모임 상세 조회
     * GET /api/meetings/:meetingId
     (URL 파라미터로 meetingId 전달)
     */
    async getMeetingDetail(req, res) {
        const { meetingId } = req.params;
        try {
            const meetingDetail = await MeetingService.getMeetingDetail(meetingId);
            res.status(200).json(meetingDetail);
        } catch (err) {
            console.error('모임 상세 조회 오류:', err);
            res.status(500).json({ error: err.message || '모임 상세 조회 실패' });
        }
    }
}

module.exports = new MeetingController();
