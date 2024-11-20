// controllers/meetingController.js

const MeetingService = require('../services/meetingService');
const CreateMeetingRequestDTO = require('../dtos/CreateMeetingRequestDTO');

class MeetingController {
    /**
     * 번개 모임 생성
     * POST /api/meetings
     */
    async createMeeting(req, res) {
        try {
            const userId = req.userId; // 인증 미들웨어를 통해 설정된 사용자 ID
            const meetingData = { ...req.body, created_by: userId };

            // CreateMeetingRequestDTO를 사용하여 요청 데이터 검증
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
            const userId = req.userId; // 인증 미들웨어를 통해 설정된 사용자 ID

            const meetings = await MeetingService.getMeetings(userId);
            res.status(200).json(meetings);
        } catch (err) {
            console.error('모임 목록 조회 오류:', err);
            res.status(500).json({ error: err.message || '모임 목록 조회 실패' });
        }
    }

    /**
     * 번개 모임 마감
     * PATCH /api/meetings/:meetingId/close
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
     */
    async joinMeeting(req, res) {
        try {
            const { meetingId } = req.params;
            const userId = req.userId; // 인증 미들웨어를 통해 설정된 사용자 ID

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
