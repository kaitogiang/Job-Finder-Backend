const express = require("express");
const application = require("../controllers/application.controller");

const router = express.Router();

router
  .route("/")
  .post(application.applyApplication)
  .get(application.findAllApplications);

router.route("/company/:companyId").get(application.getAllCompanyApplications);
router
  .route("/jobseeker/:jobseekerId")
  .get(application.getAllJobseekerApplication);
router.route("/jobposting/:jobId").post(application.updateStatus);

router
  .route("/company/:companyId/employer")
  .get(application.findEmployerByCompany);

router.route("/:storageId").get(application.findApplicationsById);

module.exports = router;
