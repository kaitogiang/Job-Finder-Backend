// File: utils.js
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

let otpStore = {};

module.exports = {
    //Hàm tạo mã OTP gồm sáu ký tự
    generateOTP: function() {
        return crypto.randomBytes(3).toString('hex'); //Generates a 6-charactor OTP
    },
    //Hàm gửi mã OTP qua mail cho người dùng xác thực
    sendEmail: async function(email) {
        dotenv.config();
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.APP_PASS
            }
        });
        const otp = this.generateOTP();
        const expiresAt = Date.now() + 2 * 60 * 1000; //2 phút hết hạn
        otpStore[email] = { otp, expiresAt };
        const mailOptions = {
            from: {
                name: 'Job Finder App',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Xác nhận tài khoản',
            text: `Mã xác nhận của bạn là: ${otp}. Mã sẽ hết hạn trong 2 phút`
        }
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        const storedOTP = otpStore[email];
        console.log(storedOTP);
        return info;
    },
    //Hàm xác thực mã OTP mà người dùng đã nhận trên mail
    verifyOTP: async function(email, otp) {
        const storedOTP = otpStore[email];
        console.log(storedOTP);
        if (!storedOTP) {
            return false;
        }
        if (storedOTP.otp!== otp) {
            return false;
        }
        if (storedOTP.expiresAt < Date.now()) {
            return false;
        }
        delete otpStore[email];
        return true;
    }
}
