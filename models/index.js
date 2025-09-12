// models/index.js

const sequelize = require('../config/sequelize');
const User = require('./user');
const Schedule = require('./schedule');
const Meeting = require('./meeting');
const Friend = require('./friend');
const FcmToken = require('./fcmToken');
const Invite = require('./invite')
const MeetingParticipant = require('./meetingParticipant');
// const ChatRooms = require('./ChatRooms');

// Friend 관계 설정
Friend.belongsTo(User, {
    foreignKey: 'requester_id', as: 'requester', onDelete: 'CASCADE',
});
Friend.belongsTo(User, {
    foreignKey: 'receiver_id', as: 'receiver', onDelete: 'CASCADE',
});
User.hasMany(Friend, {
    foreignKey: 'requester_id', as: 'sentRequests', onDelete: 'CASCADE',
});
User.hasMany(Friend, {
    foreignKey: 'receiver_id', as: 'receivedRequests', onDelete: 'CASCADE',
});

// Meeting 관계 설정
Meeting.belongsTo(User, {
    foreignKey: 'created_by', as: 'creator', onDelete: 'SET NULL',
});
User.hasMany(Meeting, {
    foreignKey: 'created_by', as: 'meetings', onDelete: 'SET NULL',
});

// MeetingParticipant 관계 설정
MeetingParticipant.belongsTo(Meeting, {
    foreignKey: 'meeting_id', as: 'meeting', onDelete: 'CASCADE',
});
Meeting.hasMany(MeetingParticipant, {
    foreignKey: 'meeting_id', as: 'participants', onDelete: 'CASCADE',
});
MeetingParticipant.belongsTo(User, {
    foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE',
});
User.hasMany(MeetingParticipant, {
    foreignKey: 'user_id', as: 'meetingParticipations', onDelete: 'CASCADE',
});

// Schedule 관계 설정
Schedule.belongsTo(User, {
    foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE',
});
User.hasMany(Schedule, {
    foreignKey: 'user_id', as: 'schedules', onDelete: 'CASCADE',
});


// Invite 관계 설정
Invite.belongsTo(Meeting, {
    foreignKey: 'meeting_id', as: 'meeting', onDelete: 'CASCADE',
});
Invite.belongsTo(User, {
    foreignKey: 'inviter_id', as: 'inviter', onDelete: 'CASCADE',
});
Invite.belongsTo(User, {
    foreignKey: 'invitee_id', as: 'invitee', onDelete: 'CASCADE',
});
User.hasMany(Invite, {
    foreignKey: 'inviter_id', as: 'sentInvites', onDelete: 'CASCADE',
});
User.hasMany(Invite, {
    foreignKey: 'invitee_id', as: 'receivedInvites', onDelete: 'CASCADE',
});
Meeting.hasMany(Invite, {
    foreignKey: 'meeting_id', as: 'invites', onDelete: 'CASCADE',
});
FcmToken.belongsTo(User, {
    foreignKey: 'userId', as: 'user', onDelete: 'CASCADE',
});
User.hasMany(FcmToken, {
    foreignKey: 'userId', as: 'fcmTokenList', onDelete: 'CASCADE',
});

module.exports = {
    sequelize, User, Friend, Schedule, Meeting, MeetingParticipant, Friend, Invite, FcmToken,
};
