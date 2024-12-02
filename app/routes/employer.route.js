const express = require("express");
const employer = require("../controllers/employer.controller");
const { uploadAvatar } = require("../config/multer.config");
const router = express.Router();

//--------PHẦN QUẢN LÝ DÀNH CHO ADMIN--------
router.route("/").get(employer.getAllEmployers);
router.route("/recent").get(employer.getAllRecentEmployers);
router.route("/locked").get(employer.getAllLockedEmployers);
router.route("/locked/:userId").get(employer.findLockedEmployerById);
router.route("/lock").post(employer.lockAccount);

//--------PHẦN QUẢN LÝ DÀNH CHO EMPLOYER--------
router.route("/sign-up").post(employer.signUp);
router.route("/sign-in").post(employer.signIn);
router.route("/send-otp").post(employer.sendOTP);

router.route("/is-employer-locked").post(employer.checkLockedEmployerByEmail);

router
  .route("/:userId")
  .get(employer.getEmployer)
  .patch(uploadAvatar, employer.updateProfile);
router.route("/:userId/check-locked").get(employer.checkLockedEmployer);
router.route("/:userId/unlock").delete(employer.unlockAccount);
router.route("/:userId/company").get(employer.findCompanyByEmployerId);

router.route("/:userId/change-email").patch(employer.changeEmail);
router.route("/:userId/change-password").patch(employer.changePassword);
router.route("/:userId/fcmToken").patch(employer.saveRegistrationToken);
router
  .route("/:userId/update-login-state-fcm")
  .patch(employer.updateLoginStateOfRegistrationToken);
module.exports = router;
