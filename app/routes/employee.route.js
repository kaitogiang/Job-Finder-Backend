const express = require('express');
const employee = require('../controllers/employee.controller');

const router = express.Router();


router.route('/signup').post(employee.signUp);
router.route('/signIn').post(employee.signIn);
router.route('/send-otp').post(employee.sendOTP);

module.exports = router;