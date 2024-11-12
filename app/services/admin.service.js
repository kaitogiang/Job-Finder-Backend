const bcrypt = require("bcryptjs");
const sharedServices = require("../utils/services.util");
const { ObjectId } = require("mongodb");
const {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  weeksToDays,
  addDays,
} = require("date-fns");

class AdminService {
  constructor(client) {
    this.client = client;
    this.admins = client.db().collection("admins");
    this.jobseekers = client.db().collection("jobseekers");
    this.employers = client.db().collection("employers");
  }

  // Method to extract admin data
  extractAdminData(payload) {
    const admin = {
      name: payload.name,
      email: payload.email,
      //   password: payload.password,
    };

    Object.keys(admin).forEach(
      (key) => admin[key] === undefined && delete admin[key]
    );

    return admin;
  }

  // Method to sign in an admin
  async signIn(payload) {
    const admin = await this.findByEmail(payload.email);
    if (!admin) {
      return null; // Admin not found
    }
    console.log(admin);
    const isPasswordCorrect = await this.comparePassword(
      payload.password,
      admin.password
    );
    if (isPasswordCorrect) {
      return admin; // Successful sign in
    }
    return null; // Incorrect password
  }

  async resetPassword(payload) {
    //Mã hóa mật khẩu
    const hashedPassword = await this.hashPassword(payload.password);
    const result = await this.admins.updateOne(
      { email: payload.email },
      { $set: { password: hashedPassword } }
    );
    return result.modifiedCount > 0;
  }

  // Method to find an admin by email
  async findByEmail(email) {
    return await this.admins.findOne({ email });
  }

  // Method to hash password
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Method to compare password
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

  //Hàm lấy thông tin admin qua email
  async getAdminByEmail(email) {
    return await this.admins.findOne({ email });
  }

  //------------Các dịch vụ thống kê dành cho admin
  //Hàm thống kê số lượng người đăng ký theo từng mốc thời gian, tuần này, tháng này và năm này
  //Người dùng gồm jobseeker and employer
  async getTotalUserRegistrationInWeek() {
    // Lấy ngày đầu tuần và cuối tuần dựa trên ngày hiện tại (tuần bắt đầu vào thứ Hai)
    const now = new Date();
    //Ngày bắt đầu trong tuần
    const start = startOfWeek(now, { weekStartsOn: 1 }); //Bắt đầu từ thứ 2
    //Ngày kết thúc trong tuần
    const end = endOfWeek(now, { weekStartsOn: 1 });
    //Thống kê dựa vào khoảng thời gian này, lọc dữ liệu trong khoảng thời gian từ start đến end
    console.log(start);
    console.log(end);
    const stats = [];
    const daysInWeek = eachDayOfInterval({ start: start, end: end });
    for (let day of daysInWeek) {
      //Đếm số lượng của jobseeker theo từng ngày
      const jobseekervalue = await this.countUserInDuration(
        false,
        startOfDay(day),
        endOfDay(day)
      );
      //Đếm số lượng của employer theo từng ngày
      const employerValue = await this.countUserInDuration(
        true,
        startOfDay(day),
        endOfDay(day)
      );
      const result = {
        label: format(day, "dd-MM-yyyy"),
        jobseekerCount: jobseekervalue,
        employerCount: employerValue,
      };
      stats.push(result);
    }
    return stats.length > 0 ? stats : [];
  }

  //Hàm lấy số lượng người đăng ký trong tháng này
  async getTotalUserRegistrationInMonth() {
    const now = new Date();
    //Lấy ngày bắt đầu và kết thúc trong tháng hiện tại
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    //Lấy số lượng tuần trong tháng
    const weeksInMonth = eachWeekOfInterval(
      { start: start, end: end },
      { weekStartsOn: 1 }
    );
    console.log(weeksInMonth);
    const stats = [];
    for (let weekStart of weeksInMonth) {
      //Đếm số lượng người đăng ký trong mỗi tuần
      // const startDayOfWeek = startOfWeek(week, { weekStartsOn: 1 }); //Ngày bắt đầu từ thứ hai trong tuần
      // const endDayOfWeek = endOfWeek(weekStart, { weekStartsOn: 1 }); //Ngày kết thúc là chủ nhật trong tuần
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      const adjustedStart = weekStart < start ? start : weekStart;
      const adjustedEnd = weekEnd > end ? end : weekEnd;

      // Kiểm tra nếu số ngày của tuần không đủ 7
      //Tính toán khoảng cách giữa hai ngày cách bao nhiêu mili giây, chia cho (1000 * 60 * 60 * 24) để chuyển
      //mili giây sang ngày, sau đó so sánh với 6, nếu nhỏ hơn tức là không đủ 1 tuần
      const isPartialWeek =
        (adjustedEnd - adjustedStart) / (1000 * 60 * 60 * 24) < 6;
      //Đếm số lượng trong tuần
      const jobseekerCountInWeek = await this.countUserInDuration(
        false,
        adjustedStart,
        adjustedEnd
      );
      const employerCountInWeek = await this.countUserInDuration(
        true,
        adjustedStart,
        adjustedEnd
      );
      const result = {
        label: `${format(adjustedStart, "dd/MM")}-${format(
          adjustedEnd,
          "dd/MM"
        )}`,
        jobseekerCount: jobseekerCountInWeek,
        employerCount: employerCountInWeek,
        isPartialWeek: isPartialWeek,
      };
      stats.push(result);
    }

    return stats.length > 0 ? stats : [];
  }

  //Hàm đếm số lượng người dùng trong năm hiện tại
  async getTotalUserRegistrationInYear() {
    const currentYear = new Date().getFullYear();
    //Lấy ngày bắt đầu và ngày kết thúc của năm hiện tại
    const startOfYearDate = new Date(currentYear, 0, 1);
    const endOfYearDate = new Date(currentYear, 11, 1);

    //Lấy danh sách tháng trong năm
    const monthsInYear = eachMonthOfInterval(
      {
        start: startOfYearDate,
        end: endOfYearDate,
      },
      { weeksToDays: 1 }
    );

    const stats = [];

    //Lặp quan mỗi tháng và đếm số lượng đăng ký
    for (let startMonthDate of monthsInYear) {
      //Lấy ngày kết thúc của tháng, bởi vì startMonthDate là ngày bắt đầu của tháng mà ngày này bắt đầu từ
      //ngày cuối cùng của năm trước
      const endMonthDate = endOfMonth(startMonthDate + 1);
      //Lấy tên tháng của ngày bắt đầu của tháng
      const monthNumber = addDays(startMonthDate, 1).getMonth() + 1;
      const monthName = `Tháng ${monthNumber}`;
      //Đếm số lượng theo từng tháng
      const jobseekerCountInYear = await this.countUserInDuration(
        false,
        startMonthDate,
        endMonthDate
      );
      const employerCountInYear = await this.countUserInDuration(
        true,
        startMonthDate,
        endMonthDate
      );
      const result = {
        label: monthName,
        jobseekerCount: jobseekerCountInYear,
        employerCount: employerCountInYear,
      };
      stats.push(result);
    }
    return stats.length > 0 ? stats : [];
  }

  //Hàm đếm số người đăng ký trong khoảng thời gian nhất định theo ngày theo loại người dùng
  ///nếu isEmployer là true thì đếm số lượng employer trong khoảng thời gian, ngược lại đếm số ứng viên
  //trong khoảng thời gian
  async countUserInDuration(isEmployer, startDate, endDate) {
    //Đếm số người dùng trong colleciton của employer
    if (isEmployer) {
      const result = await this.employers
        .aggregate([
          //Điều kiện lọc để đếm số lượng
          {
            $match: {
              createdAt: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString(),
              },
            },
          },
          {
            $count: "totalUsers",
          },
        ])
        .toArray();
      //Kết quả của result sẽ hiển thị như sau:
      /**
       * Nếu có bất kỳ một document thỏa điều kiện thì trả về mảng này [{"totalUsers": 33}]
       * Nếu không có bất kỳ document nào thì trả về mảng rỗng []
       */
      //Kiểm tra xem mảng result có chứa item nào không, nếu không thì không có phần tử nào thỏa mảng => trả về 0
      //Nếu có phẩn tử thì trả về giá trị của thuộc tính totalUsers trong object của item đầu tiên trong mảng
      return result.length > 0 ? result[0].totalUsers : 0;
    } else {
      //Đếm số người dùng trong collection của jobseeker
      const result = await this.jobseekers
        .aggregate([
          //Điều kiện lọc
          {
            $match: {
              createdAt: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString(),
              },
            },
          },
          //Đếm số lượng document
          {
            $count: "totalUsers",
          },
        ])
        .toArray();

      return result.length > 0 ? result[0].totalUsers : 0;
    }
  }
}

module.exports = AdminService;
