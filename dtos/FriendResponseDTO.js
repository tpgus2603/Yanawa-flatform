// dto/FriendRequestDTO.js

class FriendRequestDTO {
  /**
   * @param {object} friendRequest - Friend request object retrieved from the database.
   */
  constructor(friendRequest) {
      this.id = friendRequest.id;
      this.requester = {
          id: friendRequest.requester.id,
          name: friendRequest.requester.name,
          email: friendRequest.requester.email
      };
      this.receiver = {
          id: friendRequest.receiver.id,
          name: friendRequest.receiver.name,
          email: friendRequest.receiver.email
      };
      this.status = friendRequest.status;
      this.createdAt = friendRequest.createdAt;
      this.updatedAt = friendRequest.updatedAt;
  }
}

module.exports = FriendRequestDTO;
