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
router.route("/user-registration").get(admin.getTotalUserRegistrationStats);

module.exports = router;
