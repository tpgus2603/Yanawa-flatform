// models/index.js

const sequelize = require('../config/sequelize');
const User = require('./user');
const Schedule = require('./schedule');
const Meeting = require('./meeting');
const Friend = require('./friend');
const FcmToken = require('./fcmToken');
const Invite =require('./invite')
const MeetingParticipant = require('./meetingParticipant');
// const ChatRooms = require('./ChatRooms');

// 관계 설정
Friend.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' }); // 친구 요청을 보낸 사용자
Friend.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });   // 친구 요청을 받은 사용자

User.hasMany(Friend, { foreignKey: 'requester_id', as: 'sentRequests' }); // 친구 요청을 보낸 목록
User.hasMany(Friend, { foreignKey: 'receiver_id', as: 'receivedRequests' }); // 친구 요청을 받은 목록
// 연관 관계 설정
Meeting.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Meeting, { foreignKey: 'created_by', as: 'meetings' });

MeetingParticipant.belongsTo(Meeting, { foreignKey: 'meeting_id', as: 'meeting' });
Meeting.hasMany(MeetingParticipant, { foreignKey: 'meeting_id', as: 'participants' });

MeetingParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(MeetingParticipant, { foreignKey: 'user_id', as: 'meetingParticipations' });

Schedule.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Schedule, { foreignKey: 'user_id', as: 'schedules' });

Invite.belongsTo(Meeting, { foreignKey: 'meeting_id', as: 'meeting' });
Invite.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' }); // 초대한 사용자
Invite.belongsTo(User, { foreignKey: 'invitee_id', as: 'invitee' }); // 초대받은 사용자

User.hasMany(Invite, { foreignKey: 'inviter_id', as: 'sentInvites' }); // 보낸 초대 목록
User.hasMany(Invite, { foreignKey: 'invitee_id', as: 'receivedInvites' }); // 받은 초대 목록
Meeting.hasMany(Invite, { foreignKey: 'meeting_id', as: 'invites' }); // 해당 미팅의 모든 초대

module.exports = {
    sequelize,
    User,
    Friend,
    Schedule,
    Meeting,
    MeetingParticipant,
  Friend,
  FcmToken, 
  Invite,
};
