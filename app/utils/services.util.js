// File: utils.js
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

let otpStore = {};

module.exports = {
  //Hàm tạo mã OTP gồm sáu ký tự
  generateOTP: function () {
    return crypto.randomBytes(3).toString("hex"); //Generates a 6-charactor OTP
  },
  //Hàm gửi mã OTP qua mail cho người dùng xác thực
  sendEmail: async function (email) {
    dotenv.config();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.APP_PASS,
      },
    });
    const otp = this.generateOTP();
    const expiresAt = Date.now() + 2 * 60 * 1000; //2 phút hết hạn
    otpStore[email] = { otp, expiresAt };
    const mailOptions = {
      from: {
        name: "Job Finder App",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Xác nhận tài khoản",
      text: `Mã xác nhận của bạn là: ${otp}. Mã sẽ hết hạn trong 2 phút`,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    const storedOTP = otpStore[email];
    console.log(storedOTP);
    return info;
  },
  //? Hàm gửi mail cho nhà tuyển dụng về hồ sơ vừa được gửi
  sendNotificationForEmployer: async function (email, jobposting, jobseeker) {
    dotenv.config();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.APP_PASS,
      },
    });

    const mailOptions = {
      from: {
        name: "Job Finder App",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: `Xét duyệt hồ sơ ứng tuyển của ${jobseeker["firstName"]}`,
      //   text: `Bạn có một hồ sơ ứng tuyển vừa được gửi đến, hãy kiểm tra lại`,
      html: this.generateEmailContent(jobposting, jobseeker),
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  },

  //Hàm xác thực mã OTP mà người dùng đã nhận trên mail
  verifyOTP: async function (email, otp) {
    const storedOTP = otpStore[email];
    console.log(storedOTP);
    if (!storedOTP) {
      return false;
    }
    if (storedOTP.otp !== otp) {
      return false;
    }
    if (storedOTP.expiresAt < Date.now()) {
      return false;
    }
    delete otpStore[email];
    return true;
  },

  //?Hàm tạo nội dung thông báo mail khi có kết quả tuyển dung
  sendNotificationForJobseeker: async function (jobposting, jobseeker, status) {
    dotenv.config();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.APP_PASS,
      },
    });

    const mailOptions = {
      from: {
        name: "Job Finder App",
        address: process.env.EMAIL_USER,
      },
      to: jobseeker["email"],
      subject: `Thông báo kết quả ứng tuyển - ${jobseeker["firstName"]}`,
      //   text: `Bạn có một hồ sơ ứng tuyển vừa được gửi đến, hãy kiểm tra lại`,
      html:
        status == 1
          ? this.generatePassStatusContent(jobposting, jobseeker)
          : this.generateFailStatusContent(jobposting, jobseeker),
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  },

  generateEmailContent: function (jobposting, jobseeker) {
    return `
        <h1>Thông báo có ứng viên mới ứng tuyển</h1>
        <p>Xin chào</p>
        <p>Có một ứng viên mới ứng tuyển vào vị trí <strong>${jobposting["title"]}</strong>.</p>
        <p>Thông tin ứng viên </p>
        <ul>
            <li><strong>Họ và tên:</strong> ${jobseeker["lastName"]} ${jobseeker["firstName"]}</li>
            <li><strong>Email:</strong> ${jobseeker["email"]}</li>
            <li><strong>Số điện thoại:</strong> ${jobseeker["phone"]}</li>
        </ul>
        <p>Vui lòng đăng nhập vào hệ thống để xem chi tiết và quản lý ứng viên.</p>
        <p>Trân trọng,</p>
        <p>Đội ngũ quản lý</p>
    `;
  },

  generatePassStatusContent: function (jobposting, jobseeker) {
    return `
        <h1>Thông báo kết quả ứng tuyển</h1>
        <p>Xin chào ${jobseeker["firstName"]},</p>
        <p>Chúc mừng bạn đã được thông qua vòng CV và được chọn để tham gia phỏng vấn cho vị trí mà bạn đã ứng tuyển.</p>
        <p>Nhà tuyển dụng sẽ sớm liên hệ bạn cho buổi phỏng vấn.</p>
        <p>Vui lòng kiểm tra email thường xuyên để nhận thêm thông tin chi tiết.</p>
        <p>Trân trọng,</p>
        <p>Đội ngũ quản lý</p>
    `;
  },

  generateFailStatusContent: function (jobposting, jobseeker) {
    return `
        <h1>Thông báo kết quả ứng tuyển</h1>
        <p>Xin chào ${jobseeker["firstName"]},</p>
        <p>Chúng tôi rất tiếc phải thông báo rằng bạn không được thông qua vòng CV cho vị trí mà bạn đã ứng tuyển.</p>
        <p>Chúng tôi cảm ơn bạn đã quan tâm và dành thời gian ứng tuyển. Hy vọng sẽ có cơ hội hợp tác với bạn trong tương lai.</p>
        <p>Trân trọng,</p>
        <p>Đội ngũ quản lý</p>
    `;
  },
};
