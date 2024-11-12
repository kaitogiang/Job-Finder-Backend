const express = require("express");
const admin = require("../controllers/admin.controller");
const router = express.Router();

// Route for admin sign-in
router.route("/sign-in").post(admin.signIn);

// Route for sending OTP
router.route("/send-otp").post(admin.sendOTP);

// Route for resetting password
router.route("/reset-password").post(admin.resetPassword);

// Route for getting admin name
router.route("/get-admin-name").post(admin.getAdminName);

//Các thàm thống kê cho admin
//Thống kế số người đăng ký
router.route("/user-registration").get(admin.getTotalUserRegistrationStats);

//Thống kê trạng tháy khóa của mỗi người dùng
router.route("/user-account-status").get(admin.getAccountStatusCount);
module.exports = router;
