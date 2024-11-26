const MemberService = require('../services/memberService');

class MemberController {
  async registerToken(req, res) {
    const { email, fcmToken } = req.body;

    try {
      const result = await MemberService.registerToken(email, fcmToken);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error registering FCM token:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
}

module.exports = new MemberController();