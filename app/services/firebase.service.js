const { token } = require("morgan");
const admin = require("../config/firebase_admin");
const { ObjectId } = require("mongodb");

class FirebaseService {
  constructor(client) {
    this.jobseekers = client.db().collection("jobseekers");
    this.employers = client.db().collection("employers");
    this.conversations = client.db().collection("conversations");
    this.fcmToken = client.db().collection("fcm_tokens");
  }

  //Hàm lưu registration token vào database trong lần đầu tiên sử dụng ứng dụng
  async saveRegistrationTokenToDB(fcmToken, userId, isEmployer) {
    const validUserId = ObjectId.isValid(userId)
      ? ObjectId.createFromHexString(userId)
      : null;
    //Kiểm tra xem người dùng đã có token nào chưa, nếu chưa có thì tạo mới document và thêm token vào mảng
    //Nếu đã có rồi thì thêm vào mảng hiện tại
    const existingFCMTokenId = await this.checkExistingUserRegistration(
      userId,
      isEmployer
    );
    //Nếu existingFCMTOkenId khác null, tức là người này đã có ít nhất
    //một registration token trong collection fcm_tokens,
    //=> Tiến hành thêm mới token vào trong mảng của document trong collection fcm_tokens
    if (existingFCMTokenId) {
      //Người dùng đã có ít nhất một registration token nhưng họ đăng nhập
      //thiết bị khác nên có thêm một registration token mới, nên lưu thêm vào
      //danh sách token này
      const result = await this.addNewRegistrationToken(
        existingFCMTokenId,
        fcmToken
      );
      return result;
    } else {
      //Đây là người dùng đầu tiên và chưa có token nào, thêm mới một document
      //và thêm token đầu tiên vào mảng
      //Tạo một document mới trong fcm_tokens và lấy id của documents vừa tạo
      //Sau đó lưu vào collection của loại người dùng tương ứng
      const fcmId = await this.createRegistrationToken(fcmToken);
      //Lưu fcmId vào collection tương ứng cho jobseeker hoặc employer
      if (isEmployer) {
        //Lưu vào collection Employers
        const result = await this.employers.updateOne(
          { _id: validUserId },
          { $set: { fcmId: fcmId } }
        );
        return result.modifiedCount;
      } else {
        //Lưu vào collection Jobseekers
        const result = await this.jobseekers.updateOne(
          { _id: validUserId },
          { $set: { fcmId: fcmId } }
        );

        return result.modifiedCount;
      }
    }

    // const fcmTokenObject = { fcmToken: fcmToken };
    // //Phần xử lý cho người dùng là nhà tuyển dụng
    // if (isEmployer) {
    //   const result = await this.employers.updateOne(
    //     { _id: validUserId },
    //     { $set: fcmTokenObject }
    //   );
    //   return result.modifiedCount;
    // } else {
    //   //Phần xử lý cho người tìm việc
    //   const result = await this.jobseekers.updateOne(
    //     { _id: validUserId },
    //     { $set: fcmTokenObject }
    //   );
    //   return result.modifiedCount;
    // }
  }

  //Hàm kiểm tra xem người dùng đã từng sở hữu bất kỳ một registration token nào chưa
  //Mỗi registration token là một thiết bị, nếu họ đăng nhập nhiều thiết bị thì sẽ có nhiều registration token
  //Nếu có tồn tại ít nhất 1 token thì sẽ trả về id của document chứa danh sách token.
  async checkExistingUserRegistration(userId, isEmployer) {
    //Có một vài trường hợp
    //1. Người dùng là người mới và mới lần đầu mở ứng dụng và đăng ký. Không có registration token nào => fcm_id trong
    //collection của người dùng đó là null
    //2. Người dùng có  một hoặc nhiều registration token trước đó. fcm_id trong collection của người dùng đó không null

    //Kiểm tra từ collection của Employer
    if (isEmployer) {
      const employer = await this.employers.findOne({
        _id: ObjectId.createFromHexString(userId),
      });
      //Đổi thành chuỗi để tương thích với các phần khác trong những hàm gọi
      console.log("Tim fcmId trong Employers collection");
      return employer.fcmId?.toString();
    } else {
      //Kiểm tra từ collection của Jobseeker
      const jobseeker = await this.jobseekers.findOne({
        _id: ObjectId.createFromHexString(userId),
      });
      console.log("Tim fcmId trong Jobseekers collection");
      //Đổi thành chuỗi để tương thích với các phần khác trong những hàm gọi
      return jobseeker.fcmId?.toString();
    }
  }

  //Hàm thêm một registrationToken mới vào collection fcm_tokens, nếu người dùng chưa có bất kỳ một registration nào
  //thì sẽ thêm mới một registration token vào collection fcm_token, sau đó id của collection này sẽ được trả về
  //để cho tham chiếu sau này
  async createRegistrationToken(registrationToken) {
    const fcmToken = {
      token: registrationToken,
      loginState: false,
    };
    const fcmTokenList = [fcmToken];
    const result = await this.fcmToken.insertOne({
      fcmTokenInfo: fcmTokenList,
    });
    return result.insertedId;
  }

  //Hàm thêm mới một registration token vào collection fcmToken
  async addNewRegistrationToken(fcmId, registrationToken) {
    const result = await this.fcmToken.updateOne(
      { _id: ObjectId.createFromHexString(fcmId) },
      {
        $push: {
          fcmTokenInfo: {
            token: registrationToken,
            loginState: false,
          },
        },
      }
    );
    console.log(`fcmId la: ${fcmId}`);
    return result.modifiedCount;
  }
  //Hàm xóa registration token khỏi fcmTOken trong trường hợp token được cho là
  //hết hạn
  async removeInvalidateRegistrationToken(fcmId, token) {
    const result = await this.fcmToken.updateOne(
      { _id: ObjectId.createFromHexString(fcmId) },
      { $pull: { fcmTokenInfo: { token: token } } }
    );
    return result.modifiedCount;
  }

  //Hàm kiểm tra xem một registration token đã tồn tại trong
  //mảng chưa
  async checkRegistrationToken(userId, isEmployer, token) {
    let fcmId = "";
    //Nếu là Jobseeker thì lấy thuộc tính fcmId của jobseekers
    if (!isEmployer) {
      const jobseeker = await this.jobseekers.findOne({
        _id: ObjectId.createFromHexString(userId),
      });
      //Ban đầu thuộc tính fcmId có kiểu là ObjectId nên phải chuyển nó thành
      //chuỗi trước để đồng bộ cho cả hai trường hợp là có tài khoản và chưa có
      fcmId = jobseeker.fcmId?.toString();
    } else {
      //Nếu là employer thì lấy thuộc tính fcmId của Employer
      const employer = await this.employers.findOne({
        _id: ObjectId.createFromHexString(userId),
      });
      //Ban đầu thuộc tính fcmId có kiểu là ObjectId nên phải chuyển nó thành
      //chuỗi trước để đồng bộ cho cả hai trường hợp là có tài khoản và chưa có
      fcmId = employer.fcmId?.toString();
    }

    //Chỗ này phải có xác thực xem fcmId có hợp lẹ không, tại vì nếu người dùng
    //là người mới và chưa có registration token trước đó thì sẽ không có fcmId
    //Nên nếu là trường hợp này thì cho null => existingToken sẽ là null. Ám chỉ
    //Người này chưa có bất kỳ registration token trước đó
    const existingToken = await this.fcmToken.findOne({
      _id: ObjectId.isValid(fcmId) ? ObjectId.createFromHexString(fcmId) : null,
      fcmTokenInfo: {
        $elemMatch: {
          token: token,
        },
      },
    });
    return existingToken;
  }

  //Hàm cập nhật trạng thái login của một thiết bị (registration token) cụ thể
  async updateLoginStateOfRegistrationToken(
    token,
    userId,
    loginState,
    isEmployer
  ) {
    const validUserId = ObjectId.isValid(userId)
      ? ObjectId.createFromHexString(userId)
      : null;
    //Lấy thông tin fcmId tương ứng với loại người dùng
    let fcmId = "";
    //Phần xử lý cho nhà tuyển dụng
    if (isEmployer) {
      const employer = await this.employers.findOne({ _id: validUserId });
      fcmId = employer.fcmId?.toString();
    } else {
      //Phần xử lý cho người tìm việc
      const jobseeker = await this.jobseekers.findOne({
        _id: validUserId,
      });
      fcmId = jobseeker.fcmId?.toString();
    }
    //Kiểm tra xem fcmId có hợp không?
    if (!ObjectId.isValid(fcmId)) {
      console.log("fcmId khong hop le");
      return; //Không hợp lệ thì bỏ qua
    }
    //Tiến hành cập nhập thuộc tính loginState của một registration token cụ thể
    const result = await this.fcmToken.updateOne(
      {
        _id: ObjectId.createFromHexString(fcmId),
        "fcmTokenInfo.token": token,
      },
      {
        $set: {
          "fcmTokenInfo.$.loginState": loginState,
        },
      }
    );
    return result.modifiedCount;
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
    let fcmId = "";
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
      fcmId = employer.fcmId.toString();
      senderName = `${sender.firstName} ${sender.lastName}`;
    } else {
      //Người gửi là employer và người nhận là jobseeker
      const jobseeker = await this.jobseekers.findOne({
        _id: ObjectId.createFromHexString(receiverId),
      });
      const sender = await this.employers.findOne({
        _id: ObjectId.createFromHexString(senderId),
      });
      fcmId = jobseeker.fcmId.toString();
      senderName = `${sender.firstName} ${sender.lastName}`;
      // console.log("Jobseeker's registration token: ", registrationToken);
    }

    console.log("fcmId la: ", fcmId);
    //Lấy danh sách các Registration token của người dùng cụ thể trong fcm_tokens
    const fcmTokenDocument = await this.fcmToken.findOne({
      _id: ObjectId.isValid(fcmId) ? ObjectId.createFromHexString(fcmId) : null,
    });

    const fcmTokenInforArray = fcmTokenDocument.fcmTokenInfo;

    console.log("Cac registration token cua nguoi nhan: ", fcmTokenInforArray);

    // if (!fcmTokenInfo || !fcmTokenInfo.fcmTokenInfo) {
    //   console.error("No registration tokens found for the user");
    //   return;
    // }

    console.log("So luong registration token la: ", fcmTokenInforArray.length);

    let notificationArray = [];

    fcmTokenInforArray.forEach((tokenInfo) => {
      //Tạo đối tượng thông báo và nội dung cho mỗi thiết bị của người dùng
      const messageNotification = {
        token: tokenInfo.token,
        notification: {
          title: `Bạn có tin nhắn mới từ ${senderName}`,
          body: message.messageText,
        },
        data: {
          conversationId: conversationId,
          type: "message_notification",
        },
        android: {
          priority: "high",
          collapseKey: conversationId, //Thử nghiệm
        },
      };
      //Thêm thông báo vào danh sách thông báo sẽ gửi ngay đối
      //với những thiết bị nào đã đăng nhập vào tài khoản
      if (tokenInfo.loginState) {
        notificationArray.push(messageNotification);
      } else {
        //Nếu chưa đăng nhập thì lưu lại để thông báo khi người dùng dăng nhập vào
        //thiết bị đó
        console.log("Luu thong bao vao database cho nguoi nhan dang nhap lai");
      }
    });

    //Bắt đầu gửi thông báo đến thiết bị của receiver
    try {
      if (notificationArray.length == 0) {
        console.log("No devices to send notifications to");
        return;
      }
      const response = await admin.messaging().sendEach(notificationArray);
      //Kiểm tra xem mỗi response của mỗi thông báo có thành công chưa hay lỗi
      response.responses.forEach((result) => {
        console.log(`Error code cua notification: ${result.error?.code}`);
        console.log(`Error message cua notification: ${result.error?.message}`);
      });
      console.log("Successfully sent message notification: ", response);
    } catch (error) {
      console.log("Error sending message notification: ", error);
    }
  }
}

module.exports = FirebaseService;
