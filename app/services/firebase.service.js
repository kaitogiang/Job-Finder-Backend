const { token } = require("morgan");
const admin = require("../config/firebase_admin");
const { ObjectId } = require("mongodb");

class FirebaseService {
  constructor(client) {
    this.jobseekers = client.db().collection("jobseekers");
    this.employers = client.db().collection("employers");
    this.conversations = client.db().collection("conversations");
  }

  //Hàm lưu registration token vào database trong lần đầu tiên sử dụng ứng dụng
  async saveRegistrationTokenToDB(fcmToken, userId, isEmployer) {
    const validUserId = ObjectId.isValid(userId)
      ? ObjectId.createFromHexString(userId)
      : null;
    const fcmTokenObject = { fcmToken: fcmToken };
    //Phần xử lý cho người dùng là nhà tuyển dụng
    if (isEmployer) {
      const result = await this.employers.updateOne(
        { _id: validUserId },
        { $set: fcmTokenObject }
      );
      return result.modifiedCount;
    } else {
      //Phần xử lý cho người tìm việc
      const result = await this.jobseekers.updateOne(
        { _id: validUserId },
        { $set: fcmTokenObject }
      );
      return result.modifiedCount;
    }
  }

  async updateRegistrationTokenToDB(newFcmToken, userId, isEmployer) {
    const validUserId = ObjectId.isValid(userId)
      ? ObjectId.createFromHexString(userId)
      : null;
    //Phần xử lý cho nhà tuyển dụng
    if (isEmployer) {
      const result = await this.employers.updateOne(
        { _id: validUserId },
        { $set: { fcmToken: newFcmToken } }
      );
      return result.modifiedCount;
    } else {
      //Phần xử lý cho người tìm việc
      const result = await this.jobseekers.updateOne(
        { _id: validUserId },
        { $set: { fcmToken: newFcmToken } }
      );
      return result.modifiedCount;
    }
  }

  async sendMessageNotificationToDevice(message) {
    //Lấy thông tin của người gửi và người nhận

    const {
      conversationId,
      senderId,
      receiverId,
      messageText,
      senderIsJobseeker,
    } = message;

    //Lấy registrationToken của receiver, nếu senderIsJobseeker là true
    //thì người nhận là employer, ngược lại jobseeker
    let registrationToken = "";
    let senderName = "";
    console.log("senderIsJobseeker: ", senderIsJobseeker);
    //Người gửi là jobseeker, người nhận là employer
    if (senderIsJobseeker) {
      const employer = await this.employers.findOne({
        _id: ObjectId.createFromHexString(receiverId),
      });
      const sender = await this.jobseekers.findOne({
        _id: ObjectId.createFromHexString(senderId),
      });
      registrationToken = employer.fcmToken;
      senderName = `${sender.firstName} ${sender.lastName}`;
    } else {
      //Người gửi là employer và người nhận là jobseeker
      const jobseeker = await this.jobseekers.findOne({
        _id: ObjectId.createFromHexString(receiverId),
      });
      const sender = await this.employers.findOne({
        _id: ObjectId.createFromHexString(senderId),
      });
      registrationToken = jobseeker.fcmToken;
      senderName = `${sender.firstName} ${sender.lastName}`;
      console.log("Jobseeker's registration token: ", registrationToken);
    }

    //Tạo đối tượng thông báo và nội dung cho nó
    const messageNotification = {
      token: registrationToken,
      notification: {
        title: `Bạn có tin nhắn mới từ ${senderName}`,
        body: message.messageText,
      },
      data: {
        conversationId: conversationId,
      },
      android: {
        priority: "high",
        collapseKey: conversationId, //Thử nghiệm
      },
    };

    //Bắt đầu gửi thông báo đến thiết bị của receiver
    try {
      const response = await admin.messaging().send(messageNotification);
      console.log("Successfully sent message notification: ", response);
    } catch (error) {
      console.log("Error sending message notification: ", error);
    }
  }
}

module.exports = FirebaseService;
