const MeetingService = require('../services/meetingService');

class MeetingController {
  async createMeeting(req, res) {
    try {
      const result = await MeetingService.createMeeting(req.body);
      res.status(201).json(result);
    } catch (err) {
      console.error('번개 모임 생성 오류:', err);
      res.status(500).json({ error: err.message || '번개 모임 생성 실패' });
    }
  }

  async getMeetings(req, res) {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    try {
      const meetings = await MeetingService.getMeetings(userId);
      res.status(200).json(meetings);
    } catch (err) {
      console.error('모임 목록 조회 오류:', err);
      res.status(500).json({ error: err.message || '모임 목록 조회 실패' });
    }
  }

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

  async joinMeeting(req, res) {
    const { meetingId } = req.params;
    const { user_id } = req.body;

    try {
      await MeetingService.joinMeeting(meetingId, user_id);
      res.status(200).json({ message: '모임 및 채팅방 참가 완료' });
    } catch (err) {
      console.error('모임 참가 오류:', err);
      res.status(500).json({ error: err.message || '모임 참가 실패' });
    }
  }

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