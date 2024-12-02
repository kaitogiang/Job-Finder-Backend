const express = require("express");
const jobseeker = require("../controllers/jobseeker.controller");
const { uploadAvatar, uploadedPdf } = require("../config/multer.config");

const router = express.Router();

//--------PHẦN QUẢN LÝ DÀNH CHO ADMIN--------
router.route("/").get(jobseeker.getAllJobseekers);

router.route("/recent").get(jobseeker.getAllRecentJobseekers);
router.route("/locked").get(jobseeker.getAllLockedJobseekers);
router.route("/locked/:userId").get(jobseeker.getLockedJobseekerById);
router.route("/lock").post(jobseeker.lockAccount);

//--------PHẦN QUẢN LÝ DÀNH CHO JOBSEEKER--------

router.route("/sign-up").post(jobseeker.signUp);
router.route("/sign-in").post(jobseeker.signIn);
router.route("/send-otp").post(jobseeker.sendOTP);
router
  .route("/is-jobseeker-locked")
  .post(jobseeker.checkLockedJobseekerByEmail);
router
  .route("/:userId")
  .get(jobseeker.getJobseeker)
  .patch(uploadAvatar, jobseeker.updateProfile);
//--------------------------------------------
router.route("/:userId/check-locked").get(jobseeker.checkLockedJobseeker); //PHẦN CỦA ADMIN
router.route("/:userId/unlock").delete(jobseeker.unlockAccount); //PHẦN CỦA ADMIN
router.route("/:userId/delete").delete(jobseeker.deleteAccount); //PHẦN CỦA ADMIN
//--------------------------------------------
router.route("/:userId/add-skill").post(jobseeker.addSkill);
router.route("/:userId/skills").post(jobseeker.addSkills);
router.route("/:userId/skills/:skill").delete(jobseeker.removeSkill);
//CV----
router.route("/:userId/resume").patch(uploadedPdf, jobseeker.uploadPdf);
router.route("/:userId/resume/:index").delete(jobseeker.removePdf);
//CV----
router.route("/:userId/experience").post(jobseeker.addExperience);
router
  .route("/:userId/experience/:index")
  .delete(jobseeker.removeExperience)
  .get(jobseeker.getExperienceAtIndex)
  .patch(jobseeker.updateExperience);

router.route("/:userId/education").post(jobseeker.addEducation);
router
  .route("/:userId/education/:index")
  .delete(jobseeker.removeEducation)
  .get(jobseeker.getEducationAtIndex)
  .patch(jobseeker.updateEducation);

router.route("/:userId/change-email").patch(jobseeker.changeEmail);
router.route("/:userId/change-password").patch(jobseeker.changePassword);
router.route("/:userId/fcmToken").patch(jobseeker.saveRegistrationToken);
router
  .route("/:userId/update-login-state-fcm")
  .patch(jobseeker.updateLoginStateOfRegistrationToken);
module.exports = router;
