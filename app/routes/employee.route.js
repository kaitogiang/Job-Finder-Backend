const express = require('express');
const employee = require('../controllers/employee.controller');

const router = express.Router();


router.route('/sign-up').post(employee.signUp);
router.route('/sign-in').post(employee.signIn);
router.route('/send-otp').post(employee.sendOTP);

module.exports = router;