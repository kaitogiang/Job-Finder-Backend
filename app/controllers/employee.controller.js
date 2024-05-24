const EmployeeService = require('../services/employee.service');
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');
const jwt = require('jsonwebtoken');
const jwtSecret = 'mysecretKey';

//Phương thức đăng ký cho người tìm việc mới
exports.signUp = async (req, res, next) => {
    const { firstName, lastName, email, password, phone, address, otp } = req.body;
    if (!firstName) {
        return next(new ApiError(400, 'Name is required'));
    }
    if (!lastName) {
        return next(new ApiError(400, 'Last name is required'));
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
    if (!otp) {
        return next(new ApiError(400, 'OTP is required'));
    }
    try {
        const employeeService = new EmployeeService(MongoDB.client);
        const existingEmp = await employeeService.findByEmail(email);
        if (existingEmp) {
            return next(new ApiError(400, 'Email already exists'));
        }
        //Nhập mã OTP trước khi tạo tài khoản
        const isCorrectOtp = await employeeService.verifyOTP(email, otp);
        //Nếu mã otp không hợp lệ (không đúng hoặc hết hạn) thì thoát
        //ngược lại thì tạo tài khoản
        if (!isCorrectOtp) {
            return next(new ApiError(400, 'Invalid OTP'));
        }
        
        //Mã hóa mật khẩu
        req.body.password = await employeeService.hashPassword(password);
        const employee = await employeeService.signUp(req.body);
        if (employee) {
            return res.send({message: 'Signup successfully'});
        }
    } catch(error) {
        console.log(error);
        return next(new ApiError(500, 'An error occured while signing up'));
    }
}

//Phương thức đăng nhập cho người tìm việc mới
exports.signIn = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email) {
        return next(new ApiError(400, 'Email is required'));
    }
    if (!password) {
        return next(new ApiError(400, 'Password is required'));
    }

    try {
        const employeeService = new EmployeeService(MongoDB.client);
        const employee = await employeeService.signIn({email, password});
        if (!employee) {
            return next(new ApiError(401, 'Invalid email or password'));
        }
        const token = jwt.sign(
            employee, jwtSecret, {expiresIn: "1h"}
        )

        res.setHeader('Authorization', `Bearer ${token}`);
        return res.send({message: 'Signin successfully', token, expiresIn: 3600, isEmployer: false});
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, 'An error occured while signing in'));
    }
}

exports.sendOTP = async (req, res, next) => {
    const {email} = req.body;
    if (!email) {
        return next(new ApiError(400, 'Email is required'));
    }
    try{
        const employeeService = new EmployeeService(MongoDB.client);
        const sent = await employeeService.sendEmail(email);
        if (sent) {
            return res.send({message: 'OTP sent successfully'});
        }
    } catch(error) {
        console.log(error);
        return next(new ApiError(500, 'An error occured while sending OTP'));
    }
    
}

//Phương thức lấy thông tin của một người tìm việc cụ thể
exports.getEmployee = async (req, res, next) => {
    const employeeId = req.params.userId;
    if (!employeeId) {
        return next(new ApiError(400, 'Employee ID is required'));
    }
    try {
        const employeeService = new EmployeeService(MongoDB.client);
        const employee = await employeeService.findById(employeeId);
        if (!employee) {
            return next(new ApiError(404, 'Employee not found'));
        }
        return res.send(employee);
    } catch(error) {
        console.log(error);
        return next(new ApiError(500, 'An error occured while getting employee'));
    }
}
