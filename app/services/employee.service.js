const bcrypt = require('bcryptjs');
const sharedServices = require('../utils/services.util');
const { ObjectId } = require('mongodb');

class EmployeeService {
    constructor(client) {
        this.employees = client.db().collection('employees');
    }

    //Hàm trích xuất dữ liệu của Employee
    extractEmployeeData(payload) {
        const avatarId = new ObjectId('665059e1fdf21b71669818bf');
        const employee = {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            phone: payload.phone,
            password: payload.password,
            address: payload.address,
            resumeLink: payload.resumeLink,
            skill: payload.skill,
            experience: payload.experience,
            education: payload.education,
            avatarId: payload.avatarId || avatarId
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

    //Hàm gửi OTP qua email
    async sendEmail(email) {
        return await sharedServices.sendEmail(email);
    }

    //Hàm xác nhận OTP
    async verifyOTP(email, otp) {
       return await sharedServices.verifyOTP(email, otp);
    }

    //Hàm lấy thông tin của một người tìm việc dựa vào id của họ
    async findById(id) {
        return await this.employees.findOne({ _id: ObjectId.createFromHexString(id) });
    }

}

module.exports = EmployeeService;