// dto/FriendListDTO.js

class FriendListDTO {
  /**
   * @param {object} friend - Friend relationship object retrieved from the database.
   * @param {number} userId - The ID of the user whose friend list is being retrieved.
   */
  constructor(friend, userId) {
      this.id = friend.id;
      this.status = friend.status;
      this.createdAt = friend.createdAt;
      this.updatedAt = friend.updatedAt;
      this.friendInfo = friend.requester_id === userId ? {
          id: friend.receiver.id,
          name: friend.receiver.name,
          email: friend.receiver.email
      } : {
          id: friend.requester.id,
          name: friend.requester.name,
          email: friend.requester.email
      };
      this.relationshipType = friend.requester_id === userId ? 'sent' : 'received';
  }
}

module.exports = FriendListDTO;
