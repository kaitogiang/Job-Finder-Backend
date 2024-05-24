const bcrypt = require('bcryptjs');
const { Timestamp } = require('mongodb');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const crypto = require('crypto');

let otpStore = {};


class EmployeeService {
    constructor(client) {
        this.employees = client.db().collection('employees');
    }

    //Hàm trích xuất dữ liệu của Employee
    extractEmployeeData(payload) {
        const employee = {
            name: payload.name,
            email: payload.email,
            password: payload.password,
            phone: payload.phone,
            address: payload.address
        };

        Object.keys(employee).forEach(
            (key) => employee[key] === undefined && delete employee[key]
        );

        return employee;
    }
    //Hàm đăng ký tài khoản mới cho người tìm việc
    async signUp(payload) {
        const employee = this.extractEmployeeData(payload);
        const now = new Date();
        return await this.employees.insertOne({
            ...employee,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        });
    }

    //Hàm xử lý đăng nhập
    async signIn(payload) {
        const employee = await this.findByEmail(payload.email);
        if (!employee) {
            return employee;
        }
        const isPasswordCorrect = await this.comparePassword(
            payload.password,
            employee.password
        );
        if (isPasswordCorrect) {
            return employee;
        }
        return isPasswordCorrect;
    }



    //Hàm tìm tài khoản tồn tại trên CSDL dựa theo email
    async findByEmail(email) {
        return await this.employees.findOne({ email });
    }

    //hàm hashing password để mã hóa mật khẩu
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }
    //hàm kiểm tra mật khẩu
    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    //Hàm tạo mã OTP gồm 6 ký tự
    generateOTP() {
        return crypto.randomBytes(3).toString('hex'); //Generates a 6-charactor OTP
    }

    //Hàm gửi OTP qua email
    async sendEmail(email) {
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
    }

    //Hàm xác nhận OTP
    async verifyOTP(email, otp) {
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

module.exports = EmployeeService;