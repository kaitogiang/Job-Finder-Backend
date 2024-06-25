const express = require("express");
const application = require("../controllers/application.controller");

const router = express.Router();

router
  .route("/")
  .post(application.applyApplication)
  .get(application.getAllCompanyApplications);

router.route("/jobposting/:jobId").post(application.updateStatus);

module.exports = router;
