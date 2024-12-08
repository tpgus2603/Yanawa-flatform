const chatService = require('../services/chatService');

exports.createChatRoom = async (params) => {
  try {
    const chatRoomId = await chatService.createChatRoom(params);
    res.json(chatRoomId);
  } catch (err) {
    console.error('Error in createChatRoom:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

// 채팅방 목록 조회
exports.getChatRooms = async (req, res) => {
  try {
    const roomData = await chatService.getChatRooms();
    res.json(roomData);
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

// 사용자 상태 업데이트
exports.updateStatus = async (req, res) => {
  const { chatRoomId, nickname, isOnline } = req.body;
  try {
    await chatService.updateStatus(chatRoomId, nickname, isOnline);
    res.status(200).json({ message: 'User status updated successfully' });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// 읽음 상태 업데이트
exports.updateReadStatus = async (req, res) => {
  const { chatRoomId, nickname } = req.body;
  try {
    await chatService.updateReadStatus(chatRoomId, nickname);
    res.status(200).json({ message: 'Read status updated' });
  } catch (err) {
    console.error('Error updating read status:', err);
    res.status(500).json({ error: 'Failed to update read status' });
  }
};

// 읽지 않은 메시지 조회
exports.getUnreadMessages = async (req, res) => {
  const { nickname } = req.params;
  try {
    const unreadMessages = await chatService.getUnreadMessages(nickname);
    res.status(200).json(unreadMessages);
  } catch (err) {
    console.error('Error fetching unread messages:', err);
    res.status(500).json({ error: 'Failed to fetch unread messages' });
  }
};

// 읽지 않은 메시지 수 조회
exports.getUnreadCount = async (req, res) => {
  const { chatRoomId } = req.params;
  try {
    const unreadCountMap = await chatService.getUnreadCount(chatRoomId);
    res.status(200).json(unreadCountMap);
  } catch (err) {
    console.error('Error fetching unread counts:', err);
    res.status(500).json({ error: 'Failed to fetch unread counts' });
  }
};

// 읽은 로그 ID 업데이트
exports.updateReadLogId = async (req, res) => {
  const { chatRoomId, nickname, logId } = req.body;
  try {
    await chatService.updateReadLogId(chatRoomId, nickname, logId);
    res.status(200).json({ message: 'Last read logID updated' });
  } catch (err) {
    console.error('Error updating last read logID:', err);
    res.status(500).json({ error: 'Failed to update last read logID' });
  }
};

// 상태와 로그 ID 동시 업데이트
exports.updateStatusAndLogId = async (req, res) => {
  const { chatRoomId, nickname, isOnline, logId } = req.body;
  try {
    await chatService.updateStatusAndLogId(chatRoomId, nickname, isOnline, logId);
    res.status(200).json({ message: 'User status and lastReadLogId updated successfully' });
  } catch (err) {
    console.error('Error updating user status and lastReadLogId:', err);
    res.status(500).json({ error: 'Failed to update user status and lastReadLogId' });
  }
};

// 공지 등록
exports.addNotice = async (req, res) => {
  const { chatRoomId } = req.params;
  const { sender, message } = req.body;

  try {
    const notice = await chatService.addNotice(chatRoomId, sender, message);
    res.status(200).json(notice);
  } catch (error) {
    console.error('Error adding notice:', error.message);
    res.status(500).json({ error: 'Failed to add notice' });
  }
};

// 최신 공지 조회
exports.getLatestNotice = async (req, res) => {
  const { chatRoomId } = req.params;

  try {
    const latestNotice = await chatService.getLatestNotice(chatRoomId);
    if (latestNotice) {
      res.status(200).json(latestNotice);
    } else {
      res.status(404).json({ message: 'No notices found' });
    }
  } catch (error) {
    console.error('Error fetching latest notice:', error.message);
    res.status(500).json({ error: 'Failed to fetch latest notice' });
  }
};

// 공지 전체 조회
exports.getAllNotices = async (req, res) => {
  const { chatRoomId } = req.params;

  try {
    const notices = await chatService.getAllNotices(chatRoomId);
    console.log(`[getAllNotices] Notices for chatRoomId ${chatRoomId}:`, notices); // 로그 추가
    res.status(200).json(notices);
  } catch (error) {
    console.error('Error fetching all notices:', error.message);
    res.status(500).json({ error: 'Failed to fetch all notices' });
  }
};

// 공지사항 상세 조회
exports.getNoticeById = async (req, res) => {
  const { chatRoomId, noticeId } = req.params;

  try {
    const notice = await chatService.getNoticeById(chatRoomId, noticeId);

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    res.status(200).json(notice);
  } catch (error) {
    console.error('Error fetching notice by ID:', error.message);
    res.status(500).json({ error: 'Failed to fetch notice by ID' });
  }
};