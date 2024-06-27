const express = require("express");
const application = require("../controllers/application.controller");

const router = express.Router();

router.route("/").post(application.applyApplication);
router.route("/company/:companyId").get(application.getAllCompanyApplications);
router
  .route("/jobseeker/:jobseekerId")
  .get(application.getAllJobseekerApplication);
router.route("/jobposting/:jobId").post(application.updateStatus);

module.exports = router;
