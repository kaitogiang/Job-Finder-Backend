const AdminService = require("../services/admin.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const jwt = require("jsonwebtoken");
const { Admin } = require("mongodb");
const jwtSecret = "mysecretKey";

// Method for admin sign in
exports.signIn = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  if (!password) {
    return next(new ApiError(400, "Password is required"));
  }
  try {
    const adminService = new AdminService(MongoDB.client);
    const admin = await adminService.signIn({ email, password });
    if (!admin) {
      return next(new ApiError(400, "Invalid email or password"));
    }
    const token = jwt.sign({ _id: admin._id, email: admin.email }, jwtSecret, {
      expiresIn: "1h",
    });

    res.setHeader("Authorization", `Bearer ${token}`);
    return res.send({
      message: "Signin successfully",
      token,
      expiresIn: 3600,
      isEmployer: false,
    });
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while signing in"));
  }
};

exports.resetPassword = async (req, res, next) => {
  const { email, password, otp } = req.body;
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  if (!password) {
    return next(new ApiError(400, "Password is required"));
  }
  if (!otp) {
    return next(new ApiError(400, "OTP is required"));
  }
  try {
    const adminService = new AdminService(MongoDB.client);
    const verified = await adminService.verifyOTP(email, otp);
    if (!verified) {
      return next(new ApiError(400, "Invalid OTP"));
    }
    const result = await adminService.resetPassword({ email, password });
    if (!result) {
      return next(new ApiError(400, "Failed to reset password"));
    }
    return res.send({ message: "Password reset successfully" });
  } catch (error) {
    console.log(error);
  }
};

exports.sendOTP = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  try {
    const adminService = new AdminService(MongoDB.client);
    const admin = await adminService.getAdminByEmail(email);
    if (!admin) {
      return next(new ApiError(400, "Admin not found"));
    }
    const sent = await adminService.sendEmail(email);
    if (sent) {
      return res.send({ message: "OTP sent successfully" });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while sending OTP"));
  }
};

exports.getAdminName = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }
  try {
    const adminService = new AdminService(MongoDB.client);
    const admin = await adminService.getAdminByEmail(email);
    if (!admin) {
      return next(new ApiError(400, "Admin not found"));
    }
    return res.send({ name: admin.name });
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while getting admin name")
    );
  }
};

exports.getTotalUserRegistrationStats = async (req, res, next) => {
  const queryPeriod = req.query.period;
  if (
    queryPeriod != "week" &&
    queryPeriod != "month" &&
    queryPeriod != "year"
  ) {
    return next(new ApiError(400, "Time query is not valid"));
  }
  try {
    const adminService = new AdminService(MongoDB.client);
    let result;
    //Thống kê trong tuần này
    if (queryPeriod === "week") {
      result = await adminService.getTotalUserRegistrationInWeek();
      //Thống kê trong tháng này
    } else if (queryPeriod === "month") {
      result = await adminService.getTotalUserRegistrationInMonth();
    } else if (queryPeriod === "year") {
      result = await adminService.getTotalUserRegistrationInYear();
    }

    if (result) {
      return res.send(result);
    }
    console.log("the result is null");
    return res.send([]);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        "An error occurred while gettting total user registration stats"
      )
    );
  }
};

exports.getAccountStatusCount = async (req, res, next) => {
  try {
    const adminService = new AdminService(MongoDB.client);
    const result = await adminService.getAccountStatusCount();
    if (result) {
      return res.send(result);
    } else {
      return next(new ApiError(400, "An error occurred"));
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        "An error occurred while getting the account status count"
      )
    );
  }
};

exports.getJobpostingCountStats = async (req, res, next) => {
  const queriedPeriod = req.query.period;
  if (
    queriedPeriod !== "past7days" &&
    queriedPeriod !== "past4weeks" &&
    queriedPeriod != "past5months"
  ) {
    return next(new ApiError(400, "query is not valid"));
  }

  try {
    const adminService = new AdminService(MongoDB.client);
    let result;
    if (queriedPeriod === "past7days") {
      result = await adminService.getPassed7daysJobpostings();
    } else if (queriedPeriod === "past4weeks") {
      result = await adminService.getPassed2WeeksJobpostings();
    } else {
      result = await adminService.getPassed5MonthsJobposting();
    }
    if (result) {
      return res.send(result);
    }
    return next(new ApiError(400, "Can't get data"));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        "An error occurred while getting the account status count"
      )
    );
  }
};

exports.getApplicationStatusCountStats = async (req, res, next) => {
  const queriedPeriod = req.query.period;
  if (
    queriedPeriod !== "week" &&
    queriedPeriod !== "month" &&
    queriedPeriod !== "year"
  ) {
    return next(new ApiError(400, "Time Query is not valid"));
  }

  try {
    const adminService = new AdminService(MongoDB.client);
    let result;
    if (queriedPeriod === "week") {
      result = await adminService.getTotalApplicationsInWeek();
    } else if (queriedPeriod === "month") {
      result = await adminService.getTotalApplicationsInMonth();
    } else if (queriedPeriod === "year") {
      result = await adminService.getTotalApplicationInYear();
    }
    if (result) {
      return res.send(result);
    }
    return next(new ApiError(400, "Can't get application status count"));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        "An error occurred while getting application status count"
      )
    );
  }
};


//THống kê số lượng công việc và công ty trong mỗi khu vực
exports.getRecruitmentAreaCountStats = async (req, res, next) => {
  try {
    const adminService = new AdminService(MongoDB.client);
    //Mảng chứa danh sách các thống kê trong từng khu vực
    const result = await adminService.getRecruitmentArea();
    if (result) {
      return res.send(result);
    }
  } catch(error) {
    return next(new ApiError(500, "Error occoured while gettting the recruitment area"));
  }
}