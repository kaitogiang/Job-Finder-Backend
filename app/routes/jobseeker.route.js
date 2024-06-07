const express = require("express");
const jobseeker = require("../controllers/jobseeker.controller");
const { uploadAvatar, uploadedPdf } = require("../config/multer.config");

const router = express.Router();

router.route("/sign-up").post(jobseeker.signUp);
router.route("/sign-in").post(jobseeker.signIn);
router.route("/send-otp").post(jobseeker.sendOTP);
router
  .route("/:userId")
  .get(jobseeker.getJobseeker)
  .patch(uploadAvatar, jobseeker.updateProfile);
router.route("/:userId/add-skill").post(jobseeker.addSkill);
router.route("/:userId/skills").post(jobseeker.addSkills);
router.route("/:userId/skills/:skill").delete(jobseeker.removeSkill);
router
  .route("/:userId/resume")
  .patch(uploadedPdf, jobseeker.uploadPdf)
  .delete(jobseeker.removePdf);
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
module.exports = router;
