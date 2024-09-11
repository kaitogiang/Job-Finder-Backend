const { ObjectId } = require("mongodb");

class ConversationService {
  constructor(client) {
    this.conversation = client.db().collection("conversations");
    this.message = client.db().collection("messages");
  }

  //Trích xuất dữ liệu từ cuộc hội thoại
  extractConversationData(payload) {
    const conversation = {
      jobseekerId: payload.jobseekerId,
      employerId: payload.employerId,
      lastMessage: payload.lastMessage,
      lastMessageTime: payload.lastMessageTime,
      unseenMessages: payload.unseenMessages,
      createAt: payload.createAt,
      updateAt: payload.updateAt,
    };

    Object.keys(conversation).forEach(
      (key) => conversation[key] === undefined && delete conversation[key]
    );
    return conversation;
  }

  //Trích xuất dữ liệu từ tin nhắn
  extractMessageData(payload) {
    const message = {
      conversationId: ObjectId.createFromHexString(payload.conversationId),
      senderId: ObjectId.createFromHexString(payload.senderId),
      receiverId: ObjectId.createFromHexString(payload.receiverId),
      messageText: payload.messageText,
      timestamp: payload.timestamp || new Date(),
      isRead: payload.isRead || false,
    };

    Object.keys(message).forEach(
      (key) => message[key] === undefined && delete message[key]
    );
    return message;
  }

  //Hàm tạo cuộc trò chuyện giữa hai người, khi tạo thì nó
  //sẽ tạo cả cuộc hội thoại và chat rỗng
  async createConversation(payload) {
    const conversation = this.extractConversationData(payload);
    const result = await this.conversation.insertOne(conversation);
    return result.insertedId;
  }

  async isExistConversation(jobseekerId, companyId) {}

  //Lấy cuộc hội thoại theo id của cuộc hội thoại
  async findConversationById(id) {
    const result = await this.conversation
      .aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(id),
          },
        },
        {
          $lookup: {
            from: "messages",
            localField: "_id",
            foreignField: "conversationId",
            as: "messages",
          },
        },
        {
          $lookup: {
            from: "jobseekers",
            localField: "jobseekerId",
            foreignField: "_id",
            as: "jobseeker",
          },
        },
        {
          $lookup: {
            from: "employers",
            localField: "employerId",
            foreignField: "_id",
            as: "employer",
          },
        },
        {
          $unwind: "$jobseeker",
        },
        {
          $unwind: "$employer",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "jobseeker.avatarId",
            foreignField: "_id",
            as: "jobseekerAvatar",
          },
        },
        {
          $unwind: "$jobseekerAvatar",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "employer.avatarId",
            foreignField: "_id",
            as: "employerAvatar",
          },
        },
        {
          $unwind: "$employerAvatar",
        },
        {
          $project: {
            _id: 1,
            jobseeker: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$jobseekerAvatar.avatarLink",
            },
            employer: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$employerAvatar.avatarLink",
            },
            lastMessage: 1,
            lastMessageTime: 1,
            unseenMessages: 1,
            messages: 1,
          },
        },
      ])
      .toArray();
    return result[0];
  }

  //Lấy cuộc hội thoại giữa người tìm việc và nhà tuyển dụng
  async findConversationByUserId(jobseekerId, employerId) {
    const result = await this.conversation
      .aggregate([
        {
          $match: {
            jobseekerId: ObjectId.createFromHexString(jobseekerId),
            employerId: ObjectId.createFromHexString(employerId),
          },
        },
        {
          $lookup: {
            from: "messages",
            localField: "_id",
            foreignField: "conversationId",
            as: "messages",
          },
        },
        {
          $lookup: {
            from: "jobseekers",
            localField: "jobseekerId",
            foreignField: "_id",
            as: "jobseeker",
          },
        },
        {
          $lookup: {
            from: "employers",
            localField: "employerId",
            foreignField: "_id",
            as: "employer",
          },
        },
        {
          $unwind: "$jobseeker",
        },
        {
          $unwind: "$employer",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "jobseeker.avatarId",
            foreignField: "_id",
            as: "jobseekerAvatar",
          },
        },
        {
          $unwind: "$jobseekerAvatar",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "employer.avatarId",
            foreignField: "_id",
            as: "employerAvatar",
          },
        },
        {
          $unwind: "$employerAvatar",
        },
        {
          $project: {
            _id: 1,
            jobseeker: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$jobseekerAvatar.avatarLink",
            },
            employer: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$employerAvatar.avatarLink",
            },
            lastMessage: 1,
            lastMessageTime: 1,
            unseenMessages: 1,
            messages: 1,
          },
        },
      ])
      .toArray();
    return result[0];
  }

  //hàm kiểm tra xem cuộc trò chuyện đã được tạo trước đây chưa, nếu đã tồn tại thì trả về id của
  //cuộc trò chuyện, ngược lại trả về null
  //Client sẽ gửi companyId lên server, server dựa vào nó truy xuất lấy employerId,
  //sau đó kiểm tra cuộc trò chuyện giữa người tìm việc và nhà tuyển dụng có tồn tại hay không
  async findConversationByParticipantId(jobseekerId, employerId) {
    const result = await this.conversation.findOne({
      jobseekerId: ObjectId.createFromHexString(jobseekerId),
      employerId: ObjectId.createFromHexString(employerId),
    });
    return result;
  }

  //Hàm nạp tất cả các cuộc trò chuyện đã được thực hiện giữa người tìm việc với các nhà tuyển dụng khác
  async findAllConversationByJobseekerId(jobseekerId) {
    const result = await this.conversation
      .aggregate([
        {
          $match: {
            jobseekerId: ObjectId.createFromHexString(jobseekerId),
          },
        },
        {
          $lookup: {
            from: "messages",
            localField: "_id",
            foreignField: "conversationId",
            as: "messages",
          },
        },
        // {
        //   $match: {
        //     messages: { $ne: [] },
        //   },
        // },
        {
          $lookup: {
            from: "jobseekers",
            localField: "jobseekerId",
            foreignField: "_id",
            as: "jobseeker",
          },
        },
        {
          $unwind: "$jobseeker",
        },
        {
          $lookup: {
            from: "employers",
            localField: "employerId",
            foreignField: "_id",
            as: "employer",
          },
        },
        {
          $unwind: "$employer",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "jobseeker.avatarId",
            foreignField: "_id",
            as: "jobseekerAvatar",
          },
        },
        {
          $unwind: "$jobseekerAvatar",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "employer.avatarId",
            foreignField: "_id",
            as: "employerAvatar",
          },
        },
        {
          $unwind: "$employerAvatar",
        },
        {
          $project: {
            _id: 1,
            jobseeker: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$jobseekerAvatar.avatarLink",
            },
            employer: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$employerAvatar.avatarLink",
            },
            lastMessage: 1,
            lastMessageTime: 1,
            unseenMessages: 1,
            messages: 1,
          },
        },
      ])
      .toArray();
    console.log(result);
    return result;
  }

  //Quản lý lưu trữ tin nhắn
  async createMessage(payload) {
    console.log(payload);
    const message = this.extractMessageData(payload);
    //Thêm vào messages collection
    const result = await this.message.insertOne(message);
    //Chỉnh sửa lại thông tin cuộc hội thoại
    await this.conversation.updateOne(
      { _id: message.conversationId },
      {
        $set: {
          lastMessage: message.messageText,
          lastMessageTime: message.timestamp,
        },
        $inc: { unseenMessages: 1 },
      }
    );
    return {
      _id: result.insertedId,
      ...message,
    };
  }

  //Lấy tất cả tin nhắn của một cuộc hội thoại
  async getMessagesByConversationId(conversationId) {
    const result = await this.message
      .find({ conversationId: ObjectId.createFromHexString(conversationId) })
      .toArray();
    return result;
  }
}

module.exports = ConversationService;
