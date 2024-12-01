const { token } = require("morgan");
const admin = require("../config/firebase_admin");
const { ObjectId } = require("mongodb");

class FirebaseService {
  constructor(client) {
    this.jobseekers = client.db().collection("jobseekers");
    this.employers = client.db().collection("employers");
    this.conversations = client.db().collection("conversations");
    this.fcmToken = client.db().collection("fcm_tokens");
    this.jobseekerNotifications = client
      .db()
      .collection("jobseeker_notifications");
    this.employerNotifications = client
      .db()
      .collection("employer_notifications");
    this.jobpostings = client.db().collection("jobpostings");
  }

  //Hàm lưu registration token vào database trong lần đầu tiên sử dụng ứng dụng
  //loginExpiry có kiểu number
  async saveRegistrationTokenToDB(fcmToken, userId, isEmployer, loginExpiry) {
    const validUserId = ObjectId.isValid(userId)
      ? ObjectId.createFromHexString(userId)
      : null;
    //Trích xuất ngày hết hạn đăng nhập của một thiết bị, loginExpiry là thời gian sẽ hết hạn đăng nhập của một thiết bị
    //được trích xuất ra từ token khi họ đăng nhập
    //chuyển loginExpiry từ giây sang milli giây để tạo ra ngày chính xác
    //Kiểm tra xem kiểu của loginExpiry có phải là number không, nếu không thì chuyển về number để phép toán không
    //bị lỗi
    if (typeof loginExpiry !== "number") {
      loginExpiry = parseInt(loginExpiry, 10);
    }
    const loginExpiredDate = new Date(loginExpiry * 1000);

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
        fcmToken,
        loginExpiredDate
      );
      return result;
    } else {
      //Đây là người dùng đầu tiên và chưa có token nào, thêm mới một document
      //và thêm token đầu tiên vào mảng
      //Tạo một document mới trong fcm_tokens và lấy id của documents vừa tạo
      //Sau đó lưu vào collection của loại người dùng tương ứng
      //Truyền tham số loginExpiredDate vào hàm này để lưu trữ thời hạn kết thúc đăng nhập trên một thiết bị
      const fcmId = await this.createRegistrationToken(
        fcmToken,
        loginExpiredDate
      );
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
  //loginExpiredDate đang là kiểu Date, chuyển về ISOString để lưu trữ vào Database
  async createRegistrationToken(registrationToken, loginExperiedDate) {
    const loginExpiredDateISOString = loginExperiedDate.toISOString();
    const fcmToken = {
      token: registrationToken,
      // loginState: false,
      loginExpiredDate: loginExpiredDateISOString,
    };
    const fcmTokenList = [fcmToken];
    const result = await this.fcmToken.insertOne({
      fcmTokenInfo: fcmTokenList,
    });
    return result.insertedId;
  }

  //Hàm thêm mới một registration token vào collection fcmToken
  //Thêm tham số loginExpire để cho biết khi nào thì thiết bị hết đăng nhập
  //loginExpiredDate đang là dạng Date, khi lưu vào cơ sở dữ liệu thì phải chuyển sang ISOString
  async addNewRegistrationToken(fcmId, registrationToken, loginExpiredDate) {
    //Chuyển ngày hết hạn đăng nhập từ kiểu Date sang ISOString để lưu vào DB
    const loginExpiredDateISOString = loginExpiredDate.toISOString();
    const result = await this.fcmToken.updateOne(
      { _id: ObjectId.createFromHexString(fcmId) },
      {
        $push: {
          fcmTokenInfo: {
            token: registrationToken,
            // loginState: false, //Có thể bỏ sau khi hoàn thành
            loginExpiredDate: loginExpiredDateISOString,
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
    // loginState,
    updatedLoginExpiry, //Có kiểu ISOString, biến này chứa ISOString của ngày hết hạn thiết bị
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
    //Tiến hành cập nhật lại thuộc tính loginExpiredDate cho ngày hết hạn mới
    const result = await this.fcmToken.updateOne(
      {
        _id: ObjectId.createFromHexString(fcmId),
        "fcmTokenInfo.token": token,
      },
      {
        $set: {
          // "fcmTokenInfo.$.loginState": loginState,
          "fcmTokenInfo.$.loginExpiredDate": updatedLoginExpiry,
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
    let pendingDevices = []; //Mảng dùng để lưu trữ registration token của mỗi thiết bị, thiết bị nào offline không nhận được
    //thì sẽ nằm trong danh sách này
    //Gửi đến từng thiết bị mà người dùng đã đăng nhập, nếu nó còn trong trạng thái đăng nhập
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
      //Kiểm tra xem thiết bị còn đang đăng nhập không bằng cách kiểm tra thời hạn đăng nhập, nếu còn hạn thì còn đang đăng nhập,
      //nếu hết thì đã offline vì đã đăng xuất rồi.
      const loginExpiredDateString = tokenInfo.loginExpiredDate; //Lấy chuỗi ngày giờ
      const loginExpiredDate = new Date(loginExpiredDateString); //Chuyển sang đối tượng Date để so sánh
      const currentDate = new Date(); //Lấy ngày giờ hiện tại
      //Nếu thời gian đăng nhập vẫn còn thì hiển thị thông báo đến người dùng
      if (loginExpiredDate > currentDate) {
        notificationArray.push(messageNotification);
      } else {
        //Nếu chưa đăng nhập thì lưu lại để thông báo khi người dùng dăng nhập vào
        //thiết bị đó
        pendingDevices.push(tokenInfo.token); //Lưu registration token của thiết bị không nhận được tin nhắn
        console.log("Luu thong bao vao database cho nguoi nhan dang nhap lai");
      }
    });

    //Kiểm tra danh sách pending thiết bị, nếu có thì lưu trữ vào cơ sở dữ liệu
    if (pendingDevices.length != 0) {
      console.log("Co pending devices trong sendMessageNotificationToDevice");
      const title = `Bạn có tin nhắn mới từ ${senderName}`;
      const body = message.messageText;
      const metaData = {
        conversationId: conversationId,
        senderId: senderId,
      };
      await this.storePendingNotification(
        title,
        body,
        receiverId,
        // senderId,
        // conversationId,
        metaData,
        "message_notification",
        pendingDevices,
        senderIsJobseeker //senderIsJobseeker = true => isEmployer = true, senderIsJobseeker = false => isEmployer = false
        //Nếu senderIsJobseeker là true thì người nhận là employer, nếu senderIsJobseeker là false thì người nhận là jobseeker
      );
    }

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

  //Hàm gửi thông báo có hồ sơ được gửi đến cho nhà tuyển dụng
  async sendApplicationNotification(notification) {
    //metaData chứa thông tin thêm cho thông báo, chẳng hạn
    //như jobpostingId,.vvvv
    const type = "normal_notification";
    const { senderIsJobseeker, senderId, receiverId, jobpostingId } =
      notification;
    //Kiểm tra xem có đầy đủ trường hay không
    if (
      senderIsJobseeker == null ||
      senderId == null ||
      receiverId == null ||
      jobpostingId == null
    ) {
      console.log(
        "There is an empty field in notification, cannot send. Please provide enough of fields"
      );
      return;
    }
    //Lấy thông tin jobposting
    const jobposting = await this.jobpostings.findOne({
      _id: ObjectId.isValid ? ObjectId.createFromHexString(jobpostingId) : null,
    });
    //Lấy registration token của receiver, nếu senderIsJobseeker là true thì người nhận
    //là employer ngược lại jobseeker
    let fcmId = "";
    let senderName = "";
    let title = "";
    let body = "";
    let target = "";
    //Người gửi là Jobseeker, người nhận là Employer
    if (senderIsJobseeker) {
      //Lấy thông tin người nhận
      const employer = await this.employers.findOne({
        _id: ObjectId.createFromHexString(receiverId),
      });
      const sender = await this.jobseekers.findOne({
        _id: ObjectId.createFromHexString(senderId),
      });
      fcmId = employer.fcmId.toString();
      senderName = `${sender.firstName} ${sender.lastName}`;
      title = `Nhận được hồ sơ mới cho vị trí ${jobposting.title}`;
      body = `Có hồ sơ mới của từ ${senderName}. Nhấn để xem chi tiết`;
      target = "employer";
    } else {
      //Người gửi là employer và người nhận là jobseeker
      const jobseeker = await this.jobseekers.findOne({
        _id: ObjectId.createFromHexString(receiverId),
      });
      // console.log("ReceiverID la: ");
      // console.log(receiverId);
      const sender = await this.employers
        .aggregate([
          {
            $match: {
              _id: ObjectId.createFromHexString(senderId),
            },
          },
          {
            $lookup: {
              from: "companies",
              localField: "companyId",
              foreignField: "_id",
              as: "company",
            },
          },
          {
            $unwind: "$company",
          },
        ])
        .toArray();
      if (sender.length == 0) {
        console.log(
          "Cannot find the employer sender in sendApplicationNotification method"
        );
        return;
      }
      // console.log(sender);
      fcmId = jobseeker.fcmId.toString();
      senderName = sender[0].company.companyName;
      title = `Kết quả ứng tuyển cho vị trí ${jobposting.title}`;
      body = `Đã có kết quả ứng tuyển. Nhấn để xem chi tiết`;
      target = "jobseeker";
    }

    //Lấy danh sách các Registration token của người nhận
    const fcmTokenDocument = await this.fcmToken.findOne({
      _id: ObjectId.isValid(fcmId) ? ObjectId.createFromHexString(fcmId) : null,
    });

    const fcmTokenInfoArray = fcmTokenDocument.fcmTokenInfo;
    let notificationArray = [];
    let pendingDevices = []; //Mảng dùng để lưu trữ các thiết bị bị hoãn
    //Gửi đến từng thiết bị của người nhận
    fcmTokenInfoArray.forEach((tokenInfo) => {
      //tạo đối tượng thông báo và nội dung cho mỗi thiết bị
      const normalNotification = {
        token: tokenInfo.token,
        notification: {
          title: title,
          body: body,
        },
        data: {
          jobpostingId: jobpostingId,
          type: type,
          target: target,
        },
        android: {
          priority: "high",
          collapseKey: jobpostingId,
        },
      };
      //Thêm thông báo vào danh sách thông báo sẽ gửi nếu
      //thiết bị còn đăng nhập
      const loginExpiredDateString = tokenInfo.loginExpiredDate; //Lấy chuỗi ngày giờ
      const loginExpiredDate = new Date(loginExpiredDateString); //Chuyển sang kiểu Date
      console.log(`loginExpiredDateString: ${loginExpiredDateString}`);
      const currentDate = new Date(); //Lấy ngày giờ hiện tai
      //Nếu thời gian đăng nhập còn thì tức là đang đăng nhập thì thêm vào danh sách thông báo
      if (loginExpiredDate > currentDate) {
        notificationArray.push(normalNotification);
      } else {
        //Nếu chưa đăng nhập thì lưu lại vào danh sách các thiết bị bị hoãn
        //và sẽ gửi lại sau khi đăng nhập
        pendingDevices.push(tokenInfo.token); //Lưu thiết bị bị hoãn
        console.log("Luu thong bao vào database cho thiet bi offline");
      }
    });

    //Kiểm tra danh sách pending thiết bị, nếu có thì lưu vào database
    if (pendingDevices.length != 0) {
      console.log("Co pending thiet bi trong sendApplicationNotification");
      //Lưu vào database các thông báo hị hoãn
      const metaData = {
        jobpostingId: jobpostingId,
        target: target, //employer or jobseeker
      };
      await this.storePendingNotification(
        title,
        body,
        receiverId,
        metaData,
        type,
        pendingDevices,
        senderIsJobseeker //senderIsJobseeker =true => isEmployer = true
      );
    }

    //Bắt đầu gửi thông báo đến thiết bị
    try {
      if (notificationArray.length == 0) {
        console.log("No devices to send application notification to");
        return;
      }
      const response = await admin.messaging().sendEach(notificationArray);
      console.log("Successfully sent application notification");
    } catch (error) {
      console.log("Error in sending application notification: " + error);
    }
  }

  //Hàm lưu trữ thông báo bị hoãn
  async storePendingNotification(
    title,
    body,
    receiverId,
    // senderId,
    // conversationId,
    metaData,
    type,
    devices, //Danh sách các registration token của các thiết bị
    isEmployer
  ) {
    const pendingDevices = [];
    console.log(devices);
    devices.forEach((token) => {
      const deviceInfo = {
        token: token,
        status: 0,
      };
      pendingDevices.push(deviceInfo);
    });
    //Nếu lưu pending thông báo cho jobseeker
    if (!isEmployer) {
      //Tạo đối tượng để lưu tin nhắn
      const pendingNotification = {
        jobseekerId: ObjectId.createFromHexString(receiverId), //Chuyển về ObjectId
        notificationType: type,
        title: title,
        body: body,
        // metaData: {
        //   conversationId: conversationId,
        //   senderId: senderId,
        // },
        metaData: metaData,
        devices: pendingDevices,
        createdAt: new Date().toISOString(),
      };
      //Lưu thông báo vào collection JobseekerNotifications
      await this.jobseekerNotifications.insertOne(pendingNotification);
    } else {
      //Tạo đối tượng để lưu tin nhắn
      const pendingNotification = {
        employerId: ObjectId.createFromHexString(receiverId), //Chuyển về ObjectId
        notificationType: type,
        title: title,
        body: body,
        // metaData: {
        //   conversationId: conversationId,
        //   senderId: senderId,
        // },
        metaData: metaData,
        devices: pendingDevices,
        createdAt: new Date().toISOString(),
      };
      //Lưu thông báo vào collection EmployerNotifications
      await this.employerNotifications.insertOne(pendingNotification);
    }
  }
  //userId là id của jobseeker hoặc employer, isEmployer để xác định chính xác loại người dùng
  //notificationType là loại thông báo gồm message_notification hoặc normal_notification
  async sendNotificationAfterLogin(
    userId,
    isEmployer,
    notificationType,
    token
  ) {
    console.log("Token nhan duoc trong sendNotificationAfterLogin: " + token);
    //Kiểm tra và gửi lại cho nhà tuyển dụng
    //Xử lý gửi lại thông báo tin nhắn
    if (notificationType == "message_notification") {
      //Kiểm tra xem có bất kỳ thông báo tin nhắn nào còn chưa được gửi không?
      //chỉ chứa các thiết bị mà chưa nhận được thông báo
      const hasDelayedNotifications = this.checkMissedNotification(
        userId,
        "message_notification",
        token,
        isEmployer
      );
      //Nếu có phần tử lớn hơn 0 tức là có thông báo trì hoãn
      if (hasDelayedNotifications) {
        console.log("Chuan bi gui lai thong bao");
        //Lấy danh sách các thông báo bị bỏ qua của một thiết bị
        const missedNotificationList = await this.getMissedNotification(
          isEmployer,
          userId,
          token,
          notificationType
        );
        //Tạo ra mỗi thông báo và lưu vào một mảng để gửi lại
        let notificationArray = []; //Mảng chứa các notification đã được tạo để chuẩn bị gửi
        missedNotificationList.forEach((missedNotification) => {
          //Lấy các thông tin cần thiết ra
          const title = missedNotification.title;
          const body = missedNotification.body;
          const type = missedNotification.notificationType;
          const conversationId = missedNotification.metaData["conversationId"];
          const createdNotification = this.createMessageNotification(
            token,
            title,
            body,
            conversationId,
            type
          );
          notificationArray.push(createdNotification);
        });
        console.log("Notification Array");
        console.log(notificationArray);
        //Tiến hàn gửi lại các thông báo đã bị bỏ qua
        await this.resendNotifications(notificationArray);
        //Cập nhật lại trạng thái của token đối với mỗi thông báo sau khi
        //được gửi
        await this.updatePendingNotificationStatus(
          token,
          userId,
          isEmployer,
          notificationType
        );
      }
    } else if (notificationType == "normal_notification") {
      //Kiểm tra xem có bất kỳ thông báo liên quan đến application bị
      //bỏ qua hay không
      const hasDelayedNotifications = this.checkMissedNotification(
        userId,
        notificationType,
        token,
        isEmployer
      );
      //Nếu số phần tử > 0 tức là có thông báo
      if (hasDelayedNotifications) {
        console.log("Chua bi gui thong bao application lai");
        //Lấy danh sách thông báo notification bị miss
        const missedNotificationList = await this.getMissedNotification(
          isEmployer,
          userId,
          token,
          notificationType
        );
        //Tạo ra mỗi thông báo application và lưu vào mảng để gửi lại
        let notificationArray = [];
        missedNotificationList.forEach((missedNotification) => {
          //Trích xuất các thông tin cần thiết
          const title = missedNotification.title;
          const body = missedNotification.body;
          const type = missedNotification.notificationType;
          const jobpostingId = missedNotification.metaData["jobpostingId"];
          const createdNotification = this.createApplicationNotification(
            token,
            title,
            body,
            jobpostingId,
            type
          );
          notificationArray.push(createdNotification);
        });
        //Tiến hành gửi lại các thông báo đã bị bỏ qua
        await this.resendNotifications(notificationArray);
        //Cập nhật lại trạng thái của token đối với mỗi thông báo được gửi
        await this.updatePendingNotificationStatus(
          token,
          userId,
          isEmployer,
          notificationType
        );
      }
    }
  }
  //Hàm kiểm tra xem một thiệt bị có thông báo nào bị bỏ qua không
  async checkMissedNotification(
    userId,
    notificationType,
    registrationToken,
    isEmployer
  ) {
    if (isEmployer) {
      const result = await this.employerNotifications
        .aggregate([
          {
            $match: {
              employerId: ObjectId.isValid(userId)
                ? ObjectId.createFromHexString(userId)
                : null,
              notificationType: notificationType,
              devices: {
                $elemMatch: {
                  token: registrationToken,
                  status: 0,
                },
              },
            },
          },
        ])
        .toArray();
      //Nếu có ít nhất 1 phần tử có nghĩa là có thông báo bị trì hoãn
      return result.length > 0;
    }
  }
  //Hàm lấy tất cả các thông báo bị miss của một người dùng nhất định
  //với token và status, trả về các document
  async getMissedNotification(isEmployer, userId, token, notificationType) {
    //Tìm kiếm trong EmployerNotifications collection
    if (isEmployer) {
      const result = await this.employerNotifications
        .aggregate([
          {
            $match: {
              employerId: ObjectId.isValid(userId)
                ? ObjectId.createFromHexString(userId)
                : null,
              notificationType: notificationType,
              devices: {
                $elemMatch: {
                  token: token,
                  status: 0,
                },
              },
            },
          },
        ])
        .toArray();
      return result.length > 0 ? result : [];
    } else {
      //Tìm kiếm trong JobseekerNotification collection
      const result = await this.jobseekerNotifications
        .aggregate([
          {
            $match: {
              jobseekerId: ObjectId.isValid(userId)
                ? ObjectId.createFromHexString(userId)
                : null,
              notificationType: notificationType,
              devices: {
                $elemMatch: {
                  token: token,
                  status: 0,
                },
              },
            },
          },
        ])
        .toArray();
      return result.length > 0 ? result : [];
    }
  }
  //hàm gửi những thông báo đã bị hoãn, nhận vào một mảng các đối tượng
  //thông báo đã được tạo
  async resendNotifications(notificationArray) {
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

  //Hàm tạo message notification
  createMessageNotification(token, title, body, conversationId, type) {
    const messageNotification = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        conversationId: conversationId,
        type: type,
      },
      android: {
        priority: "high",
        collapseKey: conversationId, //Thử nghiệm
      },
    };

    return messageNotification;
  }

  //Hàm tạo application notification
  createApplicationNotification(token, title, body, jobpostingId, type) {
    const notification = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        jobpostingId: jobpostingId,
        type: type,
      },
      android: {
        priority: "high",
        collapseKey: jobpostingId,
      },
    };
    return notification;
  }
  //Hàm dùng để cập nhật lại trạng thái của các thông báo bị hoãn
  //nếu thiết bị đã nhận thông báo sau khi server đã gửi đi
  async updatePendingNotificationStatus(token, userId, isEmployer, type) {
    //Sẽ cập nhật bên EmployerNotification collection
    console.log("Notification type is " + type);
    if (isEmployer) {
      await this.employerNotifications.updateMany(
        {
          employerId: ObjectId.isValid(userId)
            ? ObjectId.createFromHexString(userId)
            : null,

          notificationType: type,
          "devices.token": token,
        },
        {
          $set: {
            "devices.$.status": 1,
          },
        }
      );
    } else {
      //Cập nhật bên JobseekerNotification collection
      await this.jobseekerNotifications.updateMany(
        {
          jobseekerId: ObjectId.isValid(userId)
            ? ObjectId.createFromHexString(userId)
            : null,

          notificationType: type,
          "devices.token": token,
        },
        {
          $set: {
            "devices.$.status": 1,
          },
        }
      );
    }
  }
}

module.exports = FirebaseService;
