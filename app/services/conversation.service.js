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
      unseenJobseekerMessages: payload.unseenJobseekerMessages || 0,
      unseenEmployerMessages: payload.unseenEmployerMessages || 0,
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
      senderIsJobseeker: payload.senderIsJobseeker,
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
            unseenJobseekerMessages: 1,
            unseenEmployerMessages: 1,
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
            unseenJobseekerMessages: 1,
            unseenEmployerMessages: 1,
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
    if (!result) {
      return null;
    }
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
            unseenJobseekerMessages: 1,
            unseenEmployerMessages: 1,
            messages: 1,
          },
        },
      ])
      .toArray();
    return result;
  }

  //Hàm nạp tất cả các cuộc trò chuyện đã được thực hiện giữa nhà tuyển dụng với ứng viên khác
  async findAllConversationByEmployerId(employerId) {
    const result = await this.conversation
      .aggregate([
        {
          $match: {
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
        // {
        //   $match: {
        //     messages: { $ne: [] },
        //   },
        // },
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
          $project: {
            _id: 1,
            employer: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$employerAvatar.avatarLink",
            },
            jobseeker: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              address: 1,
              avatar: "$jobseekerAvatar.avatarLink",
            },
            lastMessage: 1,
            lastMessageTime: 1,
            unseenJobseekerMessages: 1,
            unseenEmployerMessages: 1,
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
    const result = await this.message.insertOne(message);
    //Nếu người gửi là jobseeker thì cập nhật tin nhắn chưa đọc cho employer và ngược lại
    const updateField = message.senderIsJobseeker
      ? { $inc: { unseenEmployerMessages: 1 } }
      : { $inc: { unseenJobseekerMessages: 1 } };

    await this.conversation.updateOne(
      { _id: message.conversationId },
      {
        $set: {
          lastMessage: message.messageText,
          lastMessageTime: message.timestamp,
        },
        ...updateField,
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

  //Hàm cập nhật trạng thái của Message
  async updateMessageStatus(conversationId, messageId) {
    console.log("MessageId: ", messageId);
    // Xác thực và chuyển đổi các ID thành ObjectId
    const validConversationId = ObjectId.isValid(conversationId)
      ? ObjectId.createFromHexString(conversationId)
      : null;
    const validMessageId = ObjectId.isValid(messageId)
      ? ObjectId.createFromHexString(messageId)
      : null;
    console.log("validMessageId: ", validMessageId);
    // Lấy dữ liệu cuộc hội thoại và tin nhắn
    const conversation = await this.conversation.findOne({
      _id: validConversationId,
    });
    const message = await this.message.findOne({ _id: validMessageId });

    console.log(message);

    // Xác định xem người gửi tin nhắn có phải là người tìm việc không
    const senderIsJobseeker = message.senderIsJobseeker;

    console.log("SenderIsJobseeker: ", senderIsJobseeker);
    // Chuẩn bị cập nhật cho các tin nhắn chưa đọc dựa trên loại người gửi
    const updateUnseenMessages =
      senderIsJobseeker && conversation.unseenEmployerMessages > 0
        ? { $inc: { unseenEmployerMessages: -1 } }
        : !senderIsJobseeker && conversation.unseenJobseekerMessages > 0
        ? { $inc: { unseenJobseekerMessages: -1 } }
        : {};

    console.log(updateUnseenMessages);

    // Cập nhật trạng thái tin nhắn thành đã đọc
    await this.message.updateOne(
      { _id: validMessageId },
      { $set: { isRead: true } }
    );

    console.log(updateUnseenMessages);

    // Cập nhật số lượng tin nhắn chưa đọc cho cuộc hội thoại
    if (Object.entries(updateUnseenMessages).length !== 0) {
      await this.conversation.updateOne(
        { _id: validConversationId },
        updateUnseenMessages
      );
    }
  }

  //Hàm cập nhật trạng thái đã đọc của nhiều tin nhắn trong một conversation cụ thể
  //Chỉ thay đổi những tin nhắn mà recieverId là của mình.
  //Nếu user là employer thì cập nhật unseen messages của Employer, ngược lại cập nhật của jobseeker
  async markMessagesAsRead(conversationId, userId, userIsEmployer) {
    //Kiểm tra tính hợp lệ của các id
    const validConversationId = ObjectId.isValid(conversationId)
      ? ObjectId.createFromHexString(conversationId)
      : null;
    const validUserId = ObjectId.isValid(userId)
      ? ObjectId.createFromHexString(userId)
      : null;

    //Cập nhật tất cả các tin nhắn mà có receiverId là userId thành true
    await this.message.updateMany(
      {
        conversationId: validConversationId,
        isRead: false,
        receiverId: validUserId,
      },
      {
        $set: { isRead: true },
      }
    );

    //Cập nhật unseen message cho conversation
    const update = userIsEmployer
      ? { $set: { unseenEmployerMessages: 0 } }
      : { $set: { unseenJobseekerMessages: 0 } };

    await this.conversation.updateOne(
      {
        _id: validConversationId,
      },
      update
    );

    return { sucess: true };
  }

  async checkUserInConversation(conversationId, userId) {
    const validConversationId = ObjectId.isValid(conversationId)
      ? ObjectId.createFromHexString(conversationId)
      : null;
    const validUserId = ObjectId.isValid(userId)
      ? ObjectId.createFromHexString(userId)
      : null;
    const conversation = await this.conversation.findOne({
      _id: validConversationId,
    });

    const userInConversation =
      validUserId.equals(conversation.jobseekerId) ||
      validUserId.equals(conversation.employerId);

    return userInConversation;
  }
}

module.exports = ConversationService;
