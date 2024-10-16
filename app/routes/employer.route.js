const express = require("express");
const employer = require("../controllers/employer.controller");
const { uploadAvatar } = require("../config/multer.config");
const router = express.Router();

router.route("/sign-up").post(employer.signUp);
router.route("/sign-in").post(employer.signIn);
router.route("/send-otp").post(employer.sendOTP);

router
  .route("/:userId")
  .get(employer.getEmployer)
  .patch(uploadAvatar, employer.updateProfile);
router.route("/:userId/change-email").patch(employer.changeEmail);
router.route("/:userId/change-password").patch(employer.changePassword);
router.route("/:userId/fcmToken").patch(employer.saveRegistrationToken);
module.exports = router;
