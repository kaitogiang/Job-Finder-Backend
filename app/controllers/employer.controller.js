const EmployerService = require("../services/employer.service");
const FirebaseService = require("../services/firebase.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const jwt = require("jsonwebtoken");
const JobseekerService = require("../services/jobseeker.service");
const jwtSecret = "mysecretKey";
const { ObjectId } = require("mongodb"); // Add this line

//Phương thức đăng ký cho người tuyển dụng
exports.signUp = async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    address,
    role,
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    description,
    website,
    otp,
  } = req.body;
  if (!firstName) {
    return next(new ApiError(400, "First name is required"));
  }
  if (!lastName) {
    return next(new ApiError(400, "Last name is required"));
  }
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  if (!password) {
    return next(new ApiError(400, "Password is required"));
  }
  if (!phone) {
    return next(new ApiError(400, "Phone is required"));
  }
  if (!address) {
    return next(new ApiError(400, "Address is required"));
  }
  if (!role) {
    return next(new ApiError(400, "Role is required"));
  }
  if (!companyName) {
    return next(new ApiError(400, "Company name is required"));
  }
  if (!companyEmail) {
    return next(new ApiError(400, "Company email is required"));
  }
  if (!companyPhone) {
    return next(new ApiError(400, "Company phone is required"));
  }
  if (!companyAddress) {
    return next(new ApiError(400, "Company address is required"));
  }
  if (!otp) {
    return next(new ApiError(400, "OTP is required"));
  }

  try {
    const employerService = new EmployerService(MongoDB.client);
    const existingEmp = await employerService.findByEmail(email);
    if (existingEmp) {
      return next(new ApiError(400, "Email already exists"));
    }
    //Nhập mã OTP trước khi tạo tài khoản
    const isCorrectOtp = await employerService.verifyOTP(email, otp);
    //Nếu mã otp không hợp lệ (không đúng hoặc hết hạn) thì thoát
    //ngược lại thì tạo tài khoản
    if (!isCorrectOtp) {
      return next(new ApiError(400, "Invalid OTP"));
    }
    //Mã hóa mật khẩu
    req.body.password = await employerService.hashPassword(password);
    const employer = await employerService.signUp(req.body);
    if (employer) {
      return res.send({ message: "Sigup successfully" });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while signing up"));
  }
};

exports.signIn = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  if (!password) {
    return next(new ApiError(400, "Password is required"));
  }
  try {
    const employerService = new EmployerService(MongoDB.client);
    const employer = await employerService.signIn({ email, password });
    if (!employer) {
      return next(new ApiError(400, "Invalid email or password"));
    }
    const token = jwt.sign(employer, jwtSecret, { expiresIn: "1h" });
    //Debug
    console.log(`Token: ${token}`);
    const decoded = jwt.verify(token, jwtSecret);
    console.log(`Decoded: ${decoded["exp"]}`);
    //End Debug
    //Lưu trữ lại thời gian hết hạn của token đăng nhập
    const loginExperiedDate = decoded["exp"]; //Giá trị ở dạng second

    res.setHeader("Authorization", `Bearer ${token}`);
    return res.send({
      message: "Signin successfully",
      token,
      expiresIn: 3600,
      isEmployer: true,
    });
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while signing in"));
  }
};

exports.sendOTP = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  try {
    const employerService = new EmployerService(MongoDB.client);
    const sent = await employerService.sendEmail(email);
    if (sent) {
      return res.send({ message: "OTP sent successfully" });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while sending OTP"));
  }
};

exports.getEmployer = async (req, res, next) => {
  const userId = req.params.userId;
  try {
    const employer = new EmployerService(MongoDB.client);
    const emp = await employer.findById(userId);
    if (!emp) {
      return next(new ApiError(404, "Employer not found"));
    }
    return res.send(emp);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting employer"));
  }
};

exports.updateProfile = async (req, res, next) => {
  const userId = req.params.userId;
  let avatarFileName, avatarLink;
  if (Object.keys(req.body).length === 0) {
    return next(new ApiError(400, "Data to update can not be empty"));
  }
  if (req.file) {
    avatarFileName = req.file.filename;
    avatarLink = `/avatars/${avatarFileName}`;
  }
  try {
    const employerService = new EmployerService(MongoDB.client);
    const updatedUser = await employerService.updateProfile(userId, {
      ...req.body,
      avatarFileName,
      avatarLink,
    });
    if (!updatedUser) {
      return next(new ApiError(404, "Employer not found"));
    } else {
      return res.send({
        message: "Update profile successfully",
        updatedUser,
        avatarLink,
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while updating profile"));
  }
};

exports.changeEmail = async (req, res, next) => {
  const userId = req.params.userId;
  const { password, email } = req.body;
  if (!password) {
    return next(new ApiError(400, "Password is required"));
  }
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  try {
    const employerService = new EmployerService(MongoDB.client);
    //todo Kiểm tra người dùng tồn tại
    const user = await employerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    //todo kiểm tra mật khẩu
    const isMatch = await employerService.comparePassword(
      password,
      user.password
    );
    if (!isMatch) {
      return next(new ApiError(400, "Password is incorrect"));
    }
    const existingEmail = await employerService.findByEmail(email);
    if (existingEmail) {
      return next(new ApiError(400, "Email already exists"));
    }
    //todo cập nhật email mới
    const newEmail = await employerService.changeEmail(userId, email);

    if (!newEmail) {
      return next(new ApiError(404, "Employer not found"));
    } else {
      return res.send({ message: "Change email successfully", newEmail });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while changing email"));
  }
};
//todo Hàm đổi mật khẩu
exports.changePassword = async (req, res, next) => {
  const userId = req.params.userId;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword) {
    return next(new ApiError(400, "Old password is required"));
  }
  if (!newPassword) {
    return next(new ApiError(400, "New password is required"));
  }
  try {
    const employerService = new EmployerService(MongoDB.client);
    //todo kiểm tra người dùng tồn tại
    const user = await employerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    //todo kiểm tra mật khẩu
    const isMatch = await employerService.comparePassword(
      oldPassword,
      user.password
    );
    if (!isMatch) {
      return next(new ApiError(400, "Old password is incorrect"));
    }
    //todo cập nhật mật khẩu mới
    const result = await employerService.changePassword(userId, newPassword);
    if (!result) {
      return next(new ApiError(400, "Cannot change password"));
    } else {
      return res.send({
        message: "Change password successfully",
        isChanged: true,
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while changing password"));
  }
};

exports.saveRegistrationToken = async (req, res, next) => {
  const { fcmToken, loginExpiresIn } = req.body;
  const { userId } = req.params;

  console.log(userId);
  //Kiểm tra đầu vào
  if (!fcmToken) {
    return next(new ApiError(400, "fcmToken is required"));
  }
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }
  if (!loginExpiresIn) {
    return next(new ApiError(400, "loginExpiresIn is required"));
  }
  if (typeof loginExpiresIn !== "number") {
    return next(new ApiError(400, "loginExpiresIn must be an integer value"));
  }
  if (!ObjectId.isValid(userId)) {
    return next(new ApiError(400, "userId is not valid ObjectId"));
  }

  //thực hiện lưu fcmToken vào DB
  try {
    //Khởi tạo các dịch vụ
    const employerService = new EmployerService(MongoDB.client);
    const firebaseService = new FirebaseService(MongoDB.client);

    //Kiểm tra user có tồn tại không
    const user = await employerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }

    //Kiểm tra xem token này đã được thêm vào chưa,
    //cần truyền vào userId, isEmployer và fcmToken
    const existingToken = await firebaseService.checkRegistrationToken(
      userId,
      true,
      fcmToken
    );

    //Kiểm tra xem có thông báo bị hoãn trong JobseekerNotifications không
    //Nếu có thì gửi lại ngay khi người dùng đăng nhập
    await firebaseService.sendNotificationAfterLogin(
      userId,
      true,
      "message_notification",
      fcmToken
    );
    //Kiểm tra xem có bất kỳ thông báo hồ sơ ứng viên nào
    //gửi tới không
    await firebaseService.sendNotificationAfterLogin(
      userId,
      true,
      "normal_notification",
      fcmToken
    );

    if (existingToken) {
      return res.send({
        saveSuccess: true,
        message: "Your registration token has already been saved",
      });
    }

    //Nếu có tồn tại thì lưu thông tin user vào DB
    const modifiedCount = await firebaseService.saveRegistrationTokenToDB(
      fcmToken,
      userId,
      true,
      loginExpiresIn
    );
    if (modifiedCount > 0) {
      return res.send({
        saveSuccess: true,
        message: "New registration token saved successfully",
      });
    } else {
      return res.send({ saveSuccess: false });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while saving fcmToken"));
  }
};

exports.updateLoginStateOfRegistrationToken = async (req, res, next) => {
  const { userId } = req.params;
  const { fcmToken, loginState, loginExpiresIn } = req.body;
  //Kiểm tra đầu vào
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }
  if (!fcmToken) {
    return next(new ApiError(400, "fcmToken is required"));
  }
  // if (loginState == null) {
  //   return next(new ApiError(400, "loginState is required"));
  // }
  if (loginExpiresIn == null) {
    return next(new ApiError(400, "loginExpiresIn is required"));
  }

  if (typeof loginExpiresIn !== "number") {
    return next(new ApiError(400, "loginExpiresIn must be a integer value"));
  }

  // if (typeof loginState !== "boolean") {
  //   return next(new ApiError(400, "loginState must be a boolean value"));
  // }
  //loginExpiresIn là kiểu số nguyên ở dạng second, chuyển nó thành kiểu Date ISOString
  const loginExpiredDate = new Date(loginExpiresIn * 1000).toISOString();
  try {
    const firebaseService = new FirebaseService(MongoDB.client);
    const existingToken = await firebaseService.checkRegistrationToken(
      userId,
      true,
      fcmToken
    );
    if (!existingToken) {
      return next(new ApiError(400, "Registration token not found"));
    }
    //Nếu token tồn tại thì tiến hành đổi loginState
    const result = await firebaseService.updateLoginStateOfRegistrationToken(
      fcmToken,
      userId,
      // loginState,
      loginExpiredDate,
      true
    );
    if (result > 0) {
      return res.send({
        updateSucess: true,
        message: "Updated loginState of Registration Token successfully",
      });
    } else {
      return res.send({
        updateSucess: false,
        message: "Failed to update loginState of Registration Token",
      });
    }
  } catch (error) {
    return next(
      new ApiError(
        500,
        "An error occured while updating login state of registration token"
      )
    );
  }
};

exports.getAllEmployers = async (req, res, next) => {
  try {
    const employerService = new EmployerService(MongoDB.client);
    const employers = await employerService.findAll();
    return res.send(employers);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while getting all employers")
    );
  }
};

exports.getAllRecentEmployers = async (req, res, next) => {
  try {
    const employerService = new EmployerService(MongoDB.client);
    const recentEmployers = await employerService.findAllRecent();
    return res.send(recentEmployers);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while getting all recent employers")
    );
  }
};

exports.getAllLockedEmployers = async (req, res, next) => {
  try {
    const employerService = new EmployerService(MongoDB.client);
    const lockedEmployers = await employerService.findAllLocked();
    return res.send(lockedEmployers);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while getting all locked employers")
    );
  }
};

exports.checkLockedEmployer = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }
  try {
    const employerService = new EmployerService(MongoDB.client);
    const isLocked = await employerService.checkLockedEmployer(userId);
    return res.send({ isLocked });
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while checking locked employer")
    );
  }
};
//Hàm kiểm tra trạng thái tài khoản thông qua email
exports.checkLockedEmployerByEmail = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ApiError(400, "email is required"));
  }
  try {
    //Khởi tạo các dịch vụ
    const employerService = new EmployerService(MongoDB.client);
    //Tìm kiếm nhà tuyển dụng xem có tồn tại hay không
    const employer = await employerService.findByEmail(email);
    //Nếu nhà tuyển dụng không tồn tại thì báo lỗi phía client
    if (!employer) {
      return next(new ApiError(400, "Employer is not found"));
    }
    //Lấy id của nhà tuyển dụng để kiểm tra trạng thái
    //Chuyển về chuỗi tại vì khi truy vấn _id là kiểu ObjectID
    const userId = employer._id.toString();
    const isLocked = await employerService.checkLockedEmployer(userId);
    return res.send({ isLocked });
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while checking locked employer")
    );
  }
};

exports.findLockedEmployerById = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }

  if (!ObjectId.isValid(userId)) {
    return next(new ApiError(400, "userId is not valid ObjectId"));
  }

  try {
    const employerService = new EmployerService(MongoDB.client);
    //Kiểm tra xem employer có tồn tại không
    const user = await employerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    //Kiểm tra xem employer này có bị khóa không
    const isLocked = await employerService.checkLockedEmployer(userId);
    if (!isLocked) {
      return next(new ApiError(400, "Employer is not locked"));
    }
    const lockedEmployer = await employerService.findLockedEmployerById(userId);
    return res.send(lockedEmployer);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while finding locked employer by id")
    );
  }
};

exports.lockAccount = async (req, res, next) => {
  const { userId, reason } = req.body;
  const userType = "employer";
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }
  if (!reason) {
    return next(new ApiError(400, "reason is required"));
  }

  try {
    const employerService = new EmployerService(MongoDB.client);
    //Kiểm tra xem user có tồn tại không
    const user = await employerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    //Kiểm tra xem user này có bị khóa không
    const isLocked = await employerService.checkLockedEmployer(userId);
    if (isLocked) {
      return next(new ApiError(400, "Employer is already locked"));
    }
    const result = await employerService.lockAccount({
      userId,
      userType,
      reason,
    });
    if (!result) {
      return next(new ApiError(400, "Cannot lock account"));
    } else {
      return res.send({ message: "Lock account successfully", result });
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while locking employer account")
    );
  }
};

exports.unlockAccount = async (req, res, next) => {
  const { userId } = req.params;
  if (!ObjectId.isValid(userId)) {
    return next(new ApiError(400, "userId is not valid"));
  }

  try {
    const employerService = new EmployerService(MongoDB.client);
    //Kiểm tra xem user có tồn tại không
    const user = await employerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    //Kiểm tra xem user này bị khóa chưa
    const isLocked = await employerService.checkLockedEmployer(userId);
    if (!isLocked) {
      return next(new ApiError(400, "Employer is not locked"));
    }
    const result = await employerService.unlockAccount(userId);
    if (!result) {
      return next(new ApiError(400, "Cannot unlock account"));
    } else {
      return res.send({
        message: "Unlock account successfully",
        isUnlock: true,
      });
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while unlocking employer account")
    );
  }
};

exports.findCompanyByEmployerId = async (req, res, next) => {
  const { userId } = req.params;
  if (!ObjectId.isValid(userId)) {
    return next(new ApiError(400, "userId is required"));
  }

  try {
    const employerService = new EmployerService(MongoDB.client);
    //Kiểm tra xem employer có tồn tại không
    const employer = await employerService.findById(userId);
    if (!employer) {
      return next(new ApiError(400, "Employer not found"));
    }
    const company = await employerService.findCompanyByEmployerId(userId);
    if (!company) {
      return next(new ApiError(400, "Company not found"));
    }
    return res.send(company);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while finding company by employerId")
    );
  }
};
