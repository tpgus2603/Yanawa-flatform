// controllers/inviteController.js
const { Invite, Meeting, User, MeetingParticipant } = require('../models');
const MeetingService = require('../services/meetingService'); 

/**
 * 초대에 응답하는 메서드
 * @param {number} inviteId - 응답할 초대의 ID
 * @param {number} userId - 응답하는 사용자의 ID
 * @param {string} response - 응답 (ACCEPTED, DECLINED)
 * @returns {Object} 응답 결과
 */
async function respondToInvite(inviteId, userId, response) {
    // 초대 조회
    const invite = await Invite.findOne({
        where: {
            id: inviteId,
            invitee_id: userId,
        },
        include: [
            { model: Meeting, as: 'meeting' },
            { model: User, as: 'inviter' }
        ]
    });

    if (!invite) {
        throw new Error('초대를 찾을 수 없습니다.');
    }

    if (!['ACCEPTED', 'DECLINED'].includes(response)) {
        throw new Error('유효하지 않은 응답입니다.');
    }

    if (response === 'ACCEPTED') {
        // 초대 수락 시, MeetingService의 joinMeeting 메서드 호출
        await MeetingService.joinMeeting(invite.meeting_id, userId);
    }

    // 초대를 삭제
    await invite.destroy();

    return { inviteId, response };
}

/**
 * 사용자가 받은 초대 목록을 조회하는 메서드
 * @param {number} userId - 초대를 받은 사용자의 ID
 * @returns {Array} 초대 목록
 */
async function getReceivedInvites(userId) {
    const invites = await Invite.findAll({
        where: {
            invitee_id: userId,
            status: 'PENDING',
        },
        include: [
            { model: Meeting, as: 'meeting' },
            { model: User, as: 'inviter', attributes: ['id', 'name', 'email'] },
        ],
    });

    return invites;
}

module.exports = {
    respondToInvite,
    getReceivedInvites,
};
