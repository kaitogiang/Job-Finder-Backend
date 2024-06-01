const bcrypt = require('bcryptjs');
const sharedServices = require('../utils/services.util');
const { ObjectId } = require('mongodb');

class JobseekerService {
    constructor(client) {
        this.jobseekers = client.db().collection('jobseekers');
    }

    //Hàm trích xuất dữ liệu của jobseeker
    extractJobseekerData(payload) {
        const avatarId = new ObjectId('665059e1fdf21b71669818bf');
        const jobseeker = {
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

        Object.keys(jobseeker).forEach(
            (key) => jobseeker[key] === undefined && delete jobseeker[key]
        );

        return jobseeker;
    }
    //Hàm đăng ký tài khoản mới cho người tìm việc
    async signUp(payload) {
        const jobseeker = this.extractJobseekerData(payload);
        const now = new Date();
        return await this.jobseekers.insertOne({
            ...jobseeker,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        });
    }

    //Hàm xử lý đăng nhập
    async signIn(payload) {
        const jobseeker = await this.findByEmail(payload.email);
        if (!jobseeker) {
            return jobseeker;
        }
        const isPasswordCorrect = await this.comparePassword(
            payload.password,
            jobseeker.password
        );
        if (isPasswordCorrect) {
            return jobseeker;
        }
        return isPasswordCorrect;
    }

    //Hàm tìm tài khoản tồn tại trên CSDL dựa theo email
    async findByEmail(email) {
        return await this.jobseekers.findOne({ email });
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
        // const user = await this.jobseekers.findOne({ _id: ObjectId.createFromHexString(id) });
        const result = await this.jobseekers.aggregate([
            {
                $match: {
                    _id: ObjectId.createFromHexString(id)
                }
            },
            {
                $lookup: {
                    from: 'avatars',
                    localField: 'avatarId',
                    foreignField: '_id',
                    as: 'avatar'
                }
            },
            {
                $unwind: "$avatar"
            },
            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    phone: 1,
                    address: 1,
                    resumeLink: 1,
                    skills: 1,
                    experience: 1,
                    education: 1,
                    avatar: "$avatar.avatarLink",
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]).toArray();
        return result.length > 0 ? result[0] : null;
    }

}

module.exports = JobseekerService;