const express = require('express');
const employer = require('../controllers/employer.controller');

const router = express.Router();


router.route('/sign-up').post(employer.signUp);
router.route('/sign-in').post(employer.signIn);
router.route('/send-otp').post(employer.sendOTP);

module.exports = router;