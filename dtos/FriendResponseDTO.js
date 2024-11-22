// dto/FriendResponseDTO.js

class FriendResponseDTO {

  constructor(friendResponse) {
      this.id = friendResponse.id;
      this.requester = {
          id: friendResponse.requester.id,
          name: friendResponse.requester.name,
          email: friendResponse.requester.email
      };
      this.receiver = {
          id: friendResponse.receiver.id,
          name: friendResponse.receiver.name,
          email: friendResponse.receiver.email
      };
      this.status = friendResponse.status;
      this.createdAt = friendResponse.createdAt;
      this.updatedAt = friendResponse.updatedAt;
  }
}

module.exports = FriendResponseDTO;
