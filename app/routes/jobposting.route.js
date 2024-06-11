const express = require("express");
const jobposting = require("../controllers/jobposting.controller");

const router = express.Router();

router.route("/create").post(jobposting.createPost);

module.exports = router;
