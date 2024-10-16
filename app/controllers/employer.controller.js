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
    console.log(`Decoded: ${decoded}`);
    //End Debug

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
  const { fcmToken } = req.body;
  const { userId } = req.params;

  console.log(userId);
  //Kiểm tra đầu vào
  if (!fcmToken) {
    return next(new ApiError(400, "fcmToken is required"));
  }
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
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

    //Nếu có tồn tại thì lưu thông tin user vào DB
    const modifiedCount = await firebaseService.saveRegistrationTokenToDB(
      fcmToken,
      userId,
      true
    );
    if (modifiedCount > 0) {
      return res.send({ saveSuccess: true });
    } else {
      return res.send({ saveSuccess: false });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while saving fcmToken"));
  }
};
