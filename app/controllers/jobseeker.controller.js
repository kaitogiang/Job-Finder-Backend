const JobseekerService = require("../services/jobseeker.service");
const FirebaseService = require("../services/firebase.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const jwt = require("jsonwebtoken");
const jwtSecret = "mysecretKey";
const { ObjectId } = require("mongodb");

//Phương thức đăng ký cho người tìm việc mới
exports.signUp = async (req, res, next) => {
  const { firstName, lastName, email, password, phone, address, otp } =
    req.body;
  if (!firstName) {
    return next(new ApiError(400, "Name is required"));
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
  if (!otp) {
    return next(new ApiError(400, "OTP is required"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const existingEmp = await jobseekerService.findByEmail(email);
    if (existingEmp) {
      return next(new ApiError(400, "Email already exists"));
    }
    //Nhập mã OTP trước khi tạo tài khoản
    const isCorrectOtp = await jobseekerService.verifyOTP(email, otp);
    //Nếu mã otp không hợp lệ (không đúng hoặc hết hạn) thì thoát
    //ngược lại thì tạo tài khoản
    if (!isCorrectOtp) {
      return next(new ApiError(400, "Invalid OTP"));
    }

    //Mã hóa mật khẩu
    req.body.password = await jobseekerService.hashPassword(password);
    const jobseeker = await jobseekerService.signUp(req.body);
    if (jobseeker) {
      return res.send({ message: "Signup successfully" });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while signing up"));
  }
};

//Phương thức đăng nhập cho người tìm việc mới
exports.signIn = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  if (!password) {
    return next(new ApiError(400, "Password is required"));
  }

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const jobseeker = await jobseekerService.signIn({ email, password });
    if (!jobseeker) {
      return next(new ApiError(401, "Invalid email or password"));
    }
    const token = jwt.sign(jobseeker, jwtSecret, { expiresIn: "1h" });

    res.setHeader("Authorization", `Bearer ${token}`);
    return res.send({
      message: "Signin successfully",
      token,
      expiresIn: 3600,
      isEmployer: false,
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
    const jobseekerService = new JobseekerService(MongoDB.client);
    const sent = await jobseekerService.sendEmail(email);
    if (sent) {
      return res.send({ message: "OTP sent successfully" });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while sending OTP"));
  }
};

//Phương thức lấy thông tin của một người tìm việc cụ thể
exports.getJobseeker = async (req, res, next) => {
  const jobseekerId = req.params.userId;
  if (!jobseekerId) {
    return next(new ApiError(400, "jobseeker ID is required"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const jobseeker = await jobseekerService.findById(jobseekerId);
    if (!jobseeker) {
      return next(new ApiError(404, "jobseeker not found"));
    }
    return res.send(jobseeker);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting jobseeker"));
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
    const jobseekerService = new JobseekerService(MongoDB.client);
    const updatedUser = await jobseekerService.updateProfile(userId, {
      ...req.body,
      avatarFileName,
      avatarLink,
    });
    if (!updatedUser) {
      return next(new ApiError(404, "User not found"));
    } else {
      return res.send({
        message: "Profile updated successfully",
        updatedUser,
        avatarLink,
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while updating"));
  }
};

exports.addSkill = async (req, res, next) => {
  const userId = req.params.userId;
  const { skill } = req.body;
  console.log(skill);
  if (!skill) {
    return next(new ApiError(400, "Skill is required"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }
    const updatedUser = await jobseekerService.addSkill(user, skill);
    //Nếu giá trị của updatedUser là true tức là nó có một kỹ năng trùng nên không được thêm vào
    if (updatedUser == true) {
      return next(new ApiError(404, "Existing skill!!"));
    } else {
      //Nếu giá trị là một object tức là nó đã được thêm kỹ năng mới vào
      return res.send({ message: "Skill added successfully", updatedUser });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while adding skill"));
  }
};

exports.addSkills = async (req, res, next) => {
  const userId = req.params.userId;
  const { skills } = req.body; //Đây là một mảng chuỗi
  console.log(skills);
  if (!skills) {
    return next(new ApiError(400, "Skill is required"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    console.log(user);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }
    const updatedUser = await jobseekerService.addSkills(user, skills);
    if (updatedUser == true) {
      return next(new ApiError(404, "Existing skill!!"));
    } else {
      //Nếu giá trị là một object tức là nó đã được thêm kỹ năng mới vào
      return res.send({
        message: "Skill added successfully",
        updatedSkills: updatedUser["skills"],
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while adding skills"));
  }
};

exports.removeSkill = async (req, res, next) => {
  const userId = req.params.userId;
  const skill = req.params.skill;

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }
    const updatedUser = await jobseekerService.removeSkill(user, skill);
    if (!updatedUser) {
      return next(new ApiError(404, "Skill not found"));
    } else {
      return res.send({ message: "Skill removed successfully", updatedUser });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while removing skill"));
  }
};

exports.uploadPdf = async (req, res, next) => {
  const userId = req.params.userId;
  const { filename } = req.body;
  if (!filename) {
    console.log(filename);
    return next(new ApiError(400, "Filename is required"));
  }
  let pdfName, pdfLink;
  if (req.file) {
    pdfName = req.file.filename;
    pdfLink = `/pdfs/${pdfName}`;
  }
  const pdfInstance = {
    filename: filename,
    url: pdfLink,
  };

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }
    const pdf = await jobseekerService.uploadPdf(userId, pdfInstance);
    if (!pdf) {
      return next(new ApiError(404, "Pdf not found"));
    } else {
      return res.send({ message: "Pdf uploaded successfully", pdf });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while uploading pdf"));
  }
};

exports.removePdf = async (req, res, next) => {
  const userId = req.params.userId;
  const index = req.params.index;
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }
    const pdf = await jobseekerService.removePdf(userId,index);
    if (!pdf) {
      return next(new ApiError(404, "Pdf not found"));
    } else {
      return res.send({ message: "Pdf removed successfully", pdf });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while removing pdf"));
  }
};

exports.addExperience = async (req, res, next) => {
  const userId = req.params.userId;
  const { role, company, from, to } = req.body;
  if (!role) {
    return next(new ApiError(400, "Role is required"));
  }
  if (!company) {
    return next(new ApiError(400, "Company is required"));
  }
  if (!from) {
    return next(new ApiError(400, "From is required"));
  }
  if (!to) {
    return next(new ApiError(400, "To is required"));
  }

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const experience = await jobseekerService.addExperience(userId, req.body);
    if (!experience) {
      return next(new ApiError(400, "Cannot add experience"));
    } else {
      return res.send({ message: "Experience added successfully", experience });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while adding experience"));
  }
};

exports.removeExperience = async (req, res, next) => {
  const userId = req.params.userId;
  const desiredIndex = req.params.index;
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const result = await jobseekerService.removeExperience(
      userId,
      desiredIndex
    );
    if (!result) {
      return next(new ApiError(400, "Cannot remove experiece"));
    } else {
      return res.send({ message: "Remove experience successfully", result });
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while removing experience")
    );
  }
};

exports.updateExperience = async (req, res, next) => {
  const userId = req.params.userId;
  const desiredIndex = parseInt(req.params.index, 10);
  if (isNaN(desiredIndex)) {
    return next(new ApiError(400, "Invalid index"));
  }
  const { role, company, from, to } = req.body;
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const existingEducation = await jobseekerService.findExperienceByIndex(
      userId,
      desiredIndex
    );
    if (!existingEducation) {
      return next(new ApiError(400, "Experience not found"));
    }
    if (role) {
      existingEducation.role = role;
    }
    if (company) {
      existingEducation.company = company;
    }
    if (from) {
      existingEducation.from = from;
    }
    if (to) {
      existingEducation.to = to;
    }
    const experience = await jobseekerService.updateExperiece(
      userId,
      desiredIndex,
      existingEducation
    );
    if (!experience) {
      return next(new ApiError(400, "Cannot update experience"));
    } else {
      return res.send({
        message: "Experience updated successfully",
        experience,
      });
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while updating experience")
    );
  }
};

exports.addEducation = async (req, res, next) => {
  const userId = req.params.userId;
  const { school, degree, specialization, startDate, endDate } = req.body;
  if (!school) {
    return next(new ApiError(400, "School is required"));
  }
  if (!degree) {
    return next(new ApiError(400, "Degree is required"));
  }
  if (!specialization) {
    return next(new ApiError(400, "Specialization is required"));
  }
  if (!startDate) {
    return next(new ApiError(400, "Start Date is required"));
  }
  if (!endDate) {
    return next(new ApiError(400, "End Date is required"));
  }

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const education = await jobseekerService.addEducation(userId, req.body);
    if (!education) {
      return next(new ApiError(400, "Cannot add education"));
    } else {
      return res.send({ message: "Education added successfully", education });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while adding education"));
  }
};

exports.removeEducation = async (req, res, next) => {
  const userId = req.params.userId;
  const desiredIndex = req.params.index;
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const result = await jobseekerService.removeEducation(userId, desiredIndex);
    if (!result) {
      return next(new ApiError(400, "Cannot remove education"));
    } else {
      return res.send({ message: "Remove education successfully", result });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while removing education"));
  }
};

exports.getExperienceAtIndex = async (req, res, next) => {
  const userId = req.params.userId;
  const desiredIndex = parseInt(req.params.index, 10);
  if (isNaN(desiredIndex)) {
    return next(new ApiError(400, "Index must be a number"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const experience = await jobseekerService.findExperienceByIndex(
      userId,
      desiredIndex
    );
    console.log(experience);
    if (!experience) {
      return next(new ApiError(400, "Experience not found"));
    } else {
      return res.send({ message: "Experience found", experience });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while finding experience"));
  }
};

exports.updateEducation = async (req, res, next) => {
  const userId = req.params.userId;
  const desiredIndex = parseInt(req.params.index, 10);
  if (isNaN(desiredIndex)) {
    return next(new ApiError(400, "Index must be a number"));
  }

  const { school, degree, specialization, startDate, endDate } = req.body;

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const existingEducation = await jobseekerService.findEducationByIndex(
      userId,
      desiredIndex
    );
    if (!existingEducation) {
      return next(new ApiError(400, "Education not found"));
    }
    //Gán các giá trị vào đối tượng cần thay đổi
    if (school) {
      existingEducation["school"] = school;
    }
    if (degree) {
      existingEducation["degree"] = degree;
    }
    if (specialization) {
      existingEducation["specialization"] = specialization;
    }
    if (startDate) {
      existingEducation["startDate"] = startDate;
    }
    if (endDate) {
      existingEducation["endDate"] = endDate;
    }

    const education = await jobseekerService.updateEducation(
      userId,
      desiredIndex,
      existingEducation
    );
    if (!education) {
      return next(new ApiError(400, "Cannot update education"));
    } else {
      return res.send({ message: "Education updated successfully", education });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while updating education"));
  }
};

exports.getEducationAtIndex = async (req, res, next) => {
  const userId = req.params.userId;
  const desiredIndex = parseInt(req.params.index, 10); //Chuyển đổi thành số nguyên
  if (isNaN(desiredIndex)) {
    return next(new ApiError(400, "Index must be a number"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const education = await jobseekerService.findEducationByIndex(
      userId,
      desiredIndex
    );
    if (!education) {
      return next(new ApiError(400, "Education not found"));
    } else {
      return res.send({ message: "Education found successfully", education });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting education"));
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
    const jobseekerService = new JobseekerService(MongoDB.client);
    //Kiểm tra người dùng tồn tại
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    //Kiểm tra mật khẩu
    const isMatch = await jobseekerService.comparePassword(
      password,
      user.password
    );
    if (!isMatch) {
      return next(new ApiError(400, "Password is incorrect"));
    }
    const existingEmail = await jobseekerService.findByEmail(email);
    if (existingEmail) {
      return next(new ApiError(400, "Email already exists"));
    }
    //Cập nhật email mới
    const newEmail = await jobseekerService.changeEmail(userId, email);

    if (!newEmail) {
      return next(new ApiError(400, "Cannot change email"));
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
    const jobseekerService = new JobseekerService(MongoDB.client);
    //Kiểm tra người dùng tồn tại
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    //Kiểm tra mật khẩu cũ chính xác
    const isMatch = await jobseekerService.comparePassword(
      oldPassword,
      user.password
    );
    if (!isMatch) {
      return next(new ApiError(400, "Old password is incorrect"));
    }
    //Cập nhật mật khẩu mới
    const result = await jobseekerService.changePassword(userId, newPassword);

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

// exports.findRegistrationToken = async (req, res, next) => {
//   const {userId} = req.params;
//   const {fcmToken} = req.body;

//   //Kiểm tra đầu vào
//   if (!fcmToken) {
//     return next(new ApiError(400, "fcmToken is required"));
//   }
//   if (!userId) {
//     return next(new ApiError(400, "userId is required"));
//   }
//   if (!ObjectId.isValid(userId)) {
//     return next(new ApiError(400, "userId is not valid ObjectId"));
//   }

//   try {
//     const firebaseService = new FirebaseService(MongoDB.client);
//     const jobseekerService = new JobseekerService(MongoDB.client);
//     const result = await firebaseService.checkRegistrationToken();

//   } catch(error) {
//     return next(new ApiError(500, "An error occured while saving fcmToken"));
//   }
// }

exports.saveRegistrationToken = async (req, res, next) => {
  const { fcmToken, loginExpiresIn } = req.body;
  const { userId } = req.params;
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
    const jobseekerService = new JobseekerService(MongoDB.client);
    const firebaseService = new FirebaseService(MongoDB.client);

    //Kiểm tra user có tồn tại không
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }

    //Kiểm tra xem token này đã được thêm vào chưa,
    //cần truyền vào userId, isEmployer và fcmToken
    const existingToken = await firebaseService.checkRegistrationToken(
      userId,
      false,
      fcmToken
    );

    //Kiểm tra xem có thông báo bị hoãn trong JobseekerNotifications không
    //Nếu có thì gửi lại ngay khi người dùng đăng nhập
    await firebaseService.sendNotificationAfterLogin(
      userId,
      false,
      "message_notification",
      fcmToken
    );

    //Kiểm tra xem có bất kỳ thông báo kết quả nào được gửi đến không
    await firebaseService.sendNotificationAfterLogin(
      userId,
      false,
      "normal_notification",
      fcmToken
    );

    //Tiến hành lưu vào FCmToken nếu token chưa được lưu
    if (existingToken) {
      return res.send({
        saveSuccess: true,
        message: "Your registration token has already been added",
      });
    }

    //Nếu có tồn tại thì lưu thông tin user vào DB
    const modifiedCount = await firebaseService.saveRegistrationTokenToDB(
      fcmToken,
      userId,
      false,
      loginExpiresIn
    );
    if (modifiedCount > 0) {
      return res.send({
        saveSuccess: true,
        message: "Added new registration token successfully",
      });
    } else {
      return res.send({
        saveSuccess: false,
        message: "Cannot add new registration token",
      });
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
  //Chuyển đổi kiểu giâ giây sang kiểu Date
  //loginExpiresIn là kiểu số nguyên ở dạng second, chuyển nó thành kiểu Date ISOString
  const loginExpiredDate = new Date(loginExpiresIn * 1000).toISOString();
  try {
    const firebaseService = new FirebaseService(MongoDB.client);
    const existingToken = await firebaseService.checkRegistrationToken(
      userId,
      false,
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
      false
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

//--------PHẦN QUẢN LÝ DÀNH CHO ADMIN--------
exports.getAllJobseekers = async (req, res, next) => {
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const jobseekers = await jobseekerService.findAll();
    return res.send(jobseekers);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while fetching jobseekers")
    );
  }
};

exports.getAllRecentJobseekers = async (req, res, next) => {
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const recentJobseekers = await jobseekerService.findAllRecent();
    return res.send(recentJobseekers);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while fetching recent jobseekers")
    );
  }
};

exports.getAllLockedJobseekers = async (req, res, next) => {
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const lockedJobseekers = await jobseekerService.findAllLocked();
    return res.send(lockedJobseekers);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while fetching locked jobseekers")
    );
  }
};

exports.getLockedJobseekerById = async (req, res, next) => {
  const { userId } = req.params;

  if (!ObjectId.isValid(userId)) {
    return next(new ApiError(400, "userId is not valid ObjectId"));
  }

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const lockedJobseeker = await jobseekerService.findLockedJobseekerById(
      userId
    );
    if (!lockedJobseeker) {
      return next(new ApiError(400, "Locked jobseeker not found"));
    } else {
      return res.send(lockedJobseeker);
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while fetching locked jobseeker")
    );
  }
};

exports.lockAccount = async (req, res, next) => {
  const { userId, reason } = req.body;
  const userType = "jobseeker";
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }

  if (!reason) {
    return next(new ApiError(400, "reason is required"));
  }

  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    //Kiểm tra xem user có tồn tại không
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }

    //Kiểm tra xem user đã bị khóa chưa
    const isLocked = await jobseekerService.checkLockedJobseeker(userId);
    if (isLocked) {
      return next(new ApiError(400, "User is already locked"));
    }

    const result = await jobseekerService.lockAccount({
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
    return next(new ApiError(500, "An error occured while locking account"));
  }
};

exports.checkLockedJobseeker = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new ApiError(400, "jobseekerId is required"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const isLocked = await jobseekerService.checkLockedJobseeker(userId);
    return res.send({ isLocked });
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while checking locked jobseeker")
    );
  }
};

exports.unlockAccount = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    //Kiểm tra xem user có bị khóa không
    const isLocked = await jobseekerService.checkLockedJobseeker(userId);
    if (!isLocked) {
      return next(new ApiError(400, "User is not locked"));
    }
    const result = await jobseekerService.unlockAccount(userId);
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
    return next(new ApiError(500, "An error occured while unlocking account"));
  }
};

exports.deleteAccount = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    //Kiểm tra xem user có tồn tại không
    const user = await jobseekerService.findById(userId);
    if (!user) {
      return next(new ApiError(400, "User not found"));
    }
    const result = await jobseekerService.deleteAccount(userId);
    if (!result) {
      return next(new ApiError(400, "Cannot delete account"));
    } else {
      return res.send({
        message: "Delete account successfully",
        isDeleted: true,
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while deleting account"));
  }
};
