const JobseekerService = require("../services/jobseeker.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const jwt = require("jsonwebtoken");
const jwtSecret = "mysecretKey";

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
