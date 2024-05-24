const EmployerService = require('../services/employer.service');
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');
const jwt = require('jsonwebtoken');
const jwtSecret = 'mysecretKey';

//Phương thức đăng ký cho người tuyển dụng
exports.signUp = async (req, res, next) => {
    const { firstName, lastName, email, password, phone, address, role,
        companyName, companyEmail, companyPhone, companyAddress, description, website, otp
      } = req.body;
    if (!firstName) {
        return next(new ApiError(400, 'Name is required'));
    }
    if (!email) {
        return next(new ApiError(400, 'Email is required'));
    }
    if (!password) {
        return next(new ApiError(400, 'Password is required'));
    }
    if (!phone) {
        return next(new ApiError(400, 'Phone is required'));
    }
    if (!address) {
        return next(new ApiError(400, 'Address is required'));
    }
    if (!companyName) {
        return next(new ApiError(400, 'Company name is required'));
    }
    if (!companyEmail) {
        return next(new ApiError(400, 'Company email is required'));
    }
    if (!companyPhone) {
        return next(new ApiError(400, 'Company phone is required'));
    }
    if (!companyAddress) {
        return next(new ApiError(400, 'Company address is required'));
    }
    if (!description) {
        return next(new ApiError(400, 'Description is required'));
    }
    if (!website) {
        return next(new ApiError(400, 'Website is required'));
    }
    if (!otp) {
        return next(new ApiError(400, 'OTP is required'));
    }

    try{
        const employerService = new EmployerService(MongoDB.client);
        const existingEmp = await employerService.findByEmail(email);
        if (existingEmp) {
            return next(new ApiError(400, 'Email already exists'));
        }
        //Nhập mã OTP trước khi tạo tài khoản
        const isCorrectOtp = await employerService.verifyOTP(email, otp);
        //Nếu mã otp không hợp lệ (không đúng hoặc hết hạn) thì thoát
        //ngược lại thì tạo tài khoản
        if (!isCorrectOtp) {
            return next(new ApiError(400, 'Invalid OTP'));
        }
        //Mã hóa mật khẩu
        req.body.password = await employerService.hashPassword(password);
        const employer = await employerService.signUp(req.body);
        if (employer) {
            return res.send({message: 'Sigup successfully'});
        }
    } catch(error) {
        console.log(error);
        return next(new ApiError(500, 'An error occured while signing up'));
    }
}

exports.signIn = async (req, res, next) => {
    const {email, password} = req.body;
    if (!email) {
        return next(new ApiError(400, 'Email is required'));
    }
    if (!password) {
        return next(new ApiError(400, 'Password is required'));
    }
    try {
        const employerService = new EmployerService(MongoDB.client);
        const employer = await employerService.signIn({email, password});
        if (!employer) {
            return next(new ApiError(400, 'Invalid email or password'));
        }
        const token = jwt.sign(
            employer, jwtSecret, {expiresIn: "1h"}
        );
        res.setHeader('Authorization', `Bearer ${token}`);
        return res.send({message: 'Signin successfully', token, expiresIn: 3600, isEmployer: true})
    } catch(error) {
        console.log(error);
        return next(new ApiError(500, 'An error occured while signing in'));
    }
}

exports.sendOTP = async (req, res, next) => {
    const {email} = req.body;
    if (!email) {
        return next(new ApiError(400, 'Email is required'));
    }
    try {
        const employerService = new EmployerService(MongoDB.client);
        const sent = await employerService.sendEmail(email);
        if (sent) {
            return res.send({message: 'OTP sent successfully'});
        }
    } catch(error) {
        console.log(error);
        return next(new ApiError(500, 'An error occured while sending OTP'));
    }
}