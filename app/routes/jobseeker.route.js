const express = require('express');
const jobseeker = require('../controllers/jobseeker.controller');

const router = express.Router();


router.route('/sign-up').post(jobseeker.signUp);
router.route('/sign-in').post(jobseeker.signIn);
router.route('/send-otp').post(jobseeker.sendOTP);
router.route('/:userId').get(jobseeker.getJobseeker);

module.exports = router;