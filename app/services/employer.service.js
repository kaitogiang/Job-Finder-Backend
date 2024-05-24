const bcrypt = require('bcryptjs');
const sharedServices = require('../utils/services.util');
const { ObjectId } = require('mongodb');

class EmployerService {
    constructor(client) {
        this.client = client;
        this.employers = client.db().collection('employers');
        this.companies = client.db().collection('companies');
    }

    //Hàm trích xuất dữ liệu của Company
    extractCompanyData(payload) {
        const avatarId = new ObjectId('66509252fdf21b71669818c6');
        const company = {
            companyName: payload.companyName,
            companyEmail: payload.companyEmail,
            companyPhone: payload.companyPhone,
            companyAddress: payload.companyAddress,
            description: payload.description,
            website: payload.website,
            avatarId: avatarId
        }

        Object.keys(company).forEach(
            (key) => company[key] === undefined && delete company[key]
        );
        return company;

    }
    //Hàm trích xuất dữ liệu của Employer
    extractEmployerData(payload) {
        const avatarId = new ObjectId('665059e1fdf21b71669818bf');
        const employer = {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            password: payload.password,
            phone: payload.phone,
            address: payload.address,
            role: payload.role,
            avatarId: avatarId,
        };

        Object.keys(employer).forEach(
            (key) => employer[key] === undefined && delete employer[key]
        );

        return employer;
    }

    async signUp(payload) {
        const employeer = this.extractEmployerData(payload);
        const company = this.extractCompanyData(payload);
        const now = new Date();
        //Tạo công ty
        const com = await this.companies.insertOne({
            ...company,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        });
        const companyId = com.insertedId;
        //Tạo nhà tuyển dụng
        const empResult = await this.employers.insertOne({
            ...employeer,
            companyId: companyId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        });

        return empResult;
    }

    async signIn(payload) {
        const employer = await this.findByEmail(payload.email);
        if (!employer) {
            return employer;
        }
        const isPasswordCorrect = await this.comparePassword(payload.password, employer.password);
        if (isPasswordCorrect) {
            return employer;
        }
        return isPasswordCorrect;        
    }

    async findByEmail(email) {
        return await this.employers.findOne({ email });
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
}

module.exports = EmployerService;