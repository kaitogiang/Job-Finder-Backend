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
  subDays,
  subWeeks,
  subMonths,
} = require("date-fns");

class AdminService {
  constructor(client) {
    this.client = client;
    this.admins = client.db().collection("admins");
    this.jobseekers = client.db().collection("jobseekers");
    this.employers = client.db().collection("employers");
    // this.lockedUsers = client.db().collection("locked_users");
    this.lockedJobseekers = client.db().collection("locked_jobseekers");
    this.lockedEmployers = client.db().collection("locked_employers");
    this.jobpostings = client.db().collection("jobpostings");
    this.applicationStorage = client.db().collection("application_storage");
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

  //Hàm trả về số lượng tài khoản bị khóa, đang hoạt động
  async getAccountStatusCount() {
    //Đếm số lượng ứng viên và nhà tuyển dụng bị khóa
    const lockedJobseekerCount = await this.lockedJobseekers.countDocuments({});
    const lockedEmployerCount = await this.lockedEmployers.countDocuments({});
    console.log("LockedJobseeker: " + lockedJobseekerCount);
    console.log("Locked employer: " + lockedEmployerCount);
    //Đếm số lượng jobseeker đã đăng ký, nếu có thì trả về một object trong mảng, ngược lại trả về empty array
    const jobseeker = await this.jobseekers
      .aggregate([
        {
          $count: "totalJobseeker", //"totalJobseeker" là tên biến để chứa tổng số document đếm được
        },
      ])
      .toArray();
    const totalJobseeker =
      jobseeker.length > 0 ? jobseeker[0].totalJobseeker : 0;

    const employer = await this.employers
      .aggregate([
        {
          $count: "totalEmployer",
        },
      ])
      .toArray();

    const totalEmployer = employer.length > 0 ? employer[0].totalEmployer : 0;

    //Trả kết quả cuối cùng
    const finalResult = {
      activeJobseeker: totalJobseeker - lockedJobseekerCount,
      activeEmployer: totalEmployer - lockedEmployerCount,
      lockedJobseeker: lockedJobseekerCount,
      lockedEmployer: lockedEmployerCount,
    };

    return finalResult;
  }

  //Thống kê công việc mới được đăng tải
  //Hàm đếm số lượng công việc được đăng tải trong khoảng thời gian nhất định
  async countJobpostingInDuration(startDate, endDate) {
    //Đếm số người dùng trong colleciton của employer
    console.log(`${startDate} - ${endDate}`);
    const result = await this.jobpostings
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
          $count: "totalJobpostings",
        },
      ])
      .toArray();
    //Kết quả của result sẽ hiển thị như sau:
    /**
     * Nếu có bất kỳ một document thỏa điều kiện thì trả về mảng này [{"totalJobpostings": 33}]
     * Nếu không có bất kỳ document nào thì trả về mảng rỗng []
     */
    //Kiểm tra xem mảng result có chứa item nào không, nếu không thì không có phần tử nào thỏa mảng => trả về 0
    //Nếu có phẩn tử thì trả về giá trị của thuộc tính totalJobpostings trong object của item đầu tiên trong mảng
    return result.length > 0 ? result[0].totalJobpostings : 0;
  }

  //Hàm đếm số lượng bài đăng trong 7 ngày trước
  async getPassed7daysJobpostings() {
    //Lấy ngày hiện tại
    const now = new Date();
    //Lấy ngày của 7 ngày trước
    const passed7Days = subDays(now, 7);
    //Lấy các ngày trong khoảng thời gian trên
    const interval = {
      start: passed7Days,
      end: subDays(now, 1),
    };
    const stats = [];
    const datesinInterval = eachDayOfInterval(interval);

    for (let date of datesinInterval) {
      //Lấy ngày giờ bắt đầu và kết thúc của ngày
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);
      console.log(`${startDate} - ${endDate}`);
      //Đếm số lượng bài đăng mỗi ngày
      const jobpostingCount = await this.countJobpostingInDuration(
        startDate,
        endDate
      );
      //Tạo đối tượng để hiển thị label và số lượng
      const jobData = {
        label: `${format(date, "dd/MM")}`,
        jobCount: jobpostingCount,
      };
      stats.push(jobData);
    }

    return stats;
  }

  //Hàm thống kê số lượng bài đăng trong 4 tuần trước
  async getPassed2WeeksJobpostings() {
    //Lấy ngày hiện tại
    const currentDate = new Date();
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });

    let stats = [];

    for (let i = 4; i > 0; i--) {
      const startOfPreviousWeek = startOfWeek(subWeeks(startOfCurrentWeek, i), {
        weekStartsOn: 1,
      });
      const endOfPreviousWeek = endOfWeek(subWeeks(startOfCurrentWeek, i), {
        weekStartsOn: 1,
      });

      // Định dạng ngày cho dễ đọc
      const formattedStart = format(startOfPreviousWeek, "dd/MM");
      const formattedEnd = format(endOfPreviousWeek, "dd/MM");

      //Đếm số giá trị trong khoảng
      const jobCount = await this.countJobpostingInDuration(
        startOfPreviousWeek,
        endOfPreviousWeek
      );

      const result = {
        label: `${formattedStart}-${formattedEnd}`,
        jobCount: jobCount,
      };

      stats.push(result);
    }

    return stats;
  }

  //Hàm thống kê số lượng bài đăng trong vòng 5 tháng trước
  async getPassed5MonthsJobposting() {
    //Giả sử tháng hiện tại là 11
    const currentDate = new Date();
    //Phải lấy ngày đầu của tháng để trừ thì mới ra đúng kết quả. Nếu hiện tại là 15/11 nếu trừ 5 tháng tính từ ngày này
    //thì nó sẽ trả về 15/6. Mà đây chưa phải là đầu tháng nên sẽ sai.
    //Chuyển về đầu tháng hiện tại trước để trừ thì khi trả về thì nó sẽ trả về đầu tháng của 5 tháng trước đó
    //Khi trừ như vậy thì tháng hiện tại vẫn được tính vào. Cách 5 tháng trước và + tháng hiện tại,
    //Nên nó hiển thị 6 tháng bao gồm tháng hiện tại
    const startOfCurrentMonth = startOfMonth(currentDate);
    const fiveMonthAgo = subMonths(startOfCurrentMonth, 5);

    console.log("Five month ago: " + fiveMonthAgo);
    const monthInterval = eachMonthOfInterval({
      start: fiveMonthAgo,
      end: subDays(startOfCurrentMonth, 1), //endDate sẽ là endDate của tháng cuối cùng, trừ đi 1 để nó không lấy tháng hiện tại
      //mà trả về ngày cuối cùng của tháng trước đó, nên nó sẽ hiển thị đúng 5 tháng
    });

    const stats = [];

    for (let month of monthInterval) {
      const startMonthDate = startOfMonth(month);
      const endMonthDate = endOfMonth(month);
      const formattedStartDate = format(startMonthDate, "dd-MM-yyyy");
      const formattedEndDate = format(endMonthDate, "dd-MM-yyyy");
      //Đếm số lượng bài đăng mỗi tháng
      const jobCount = await this.countJobpostingInDuration(
        startMonthDate,
        endMonthDate
      );
      const monthName = `Tháng ${startMonthDate.getMonth() + 1}`;
      const result = {
        label: monthName,
        jobCount: jobCount,
      };
      stats.push(result);
    }

    return stats;
  }

  //Hàm thống kê ứng tuyển trong
  //Hàm tính toán số lượng đơn theo trạng thái trong khoảng thời gian nhất định, theo trạng thái
  //0 là đã nhận, 1 đã chấp nhận, 2 đã gửi
  async countApplicationInDuration(statusIndex, startDate, endDate) {
    //Đếm số người dùng trong colleciton của employer
    console.log(
      "Start: " + startDate.toISOString() + " end: " + endDate.toISOString()
    );
    const result = await this.applicationStorage
      .aggregate([
        //Điều kiện lọc để đếm số lượng
        {
          $match: {
            "applications.submittedAt": {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString(),
            },
            "applications.status": statusIndex, //lọc các đơn có status là statusIndex
          },
        },
        //Lọc các phần tử trong mảng applications
        {
          $project: {
            applications: {
              $filter: {
                input: "$applications", //Mảng applications trong mỗi document
                as: "application", //đặt tên cho từng phần tử trong mảng, application đại diện cho mỗi phần tử trong mảng
                cond: {
                  $and: [
                    //Đặt điều kiện lọc đồng thời, sử dụng $$ (hai dấu $) để truy cập đến biến đã đặt tên,
                    //nếu chỉ sử dụng $ (một dấu $) thì mongodb sẽ hiểu là truy cập đến thuộc tính trong document chứ không
                    //phải biến trong mảng
                    {
                      $gte: [
                        "$$application.submittedAt",
                        startDate.toISOString(),
                      ],
                    },
                    {
                      $lte: [
                        "$$application.submittedAt",
                        endDate.toISOString(),
                      ],
                    },
                    { $eq: ["$$application.status", statusIndex] },
                  ],
                },
              },
            },
          },
        },
        //Thêm trường applicationCount để lưu trữ số lượng đơn thỏa mảng điều kiện trong mảng applications
        {
          $addFields: {
            applicationsCount: { $size: "$applications" },
          },
        },
        // //Nhóm các document lại và đếm tổng số của applicationsCount của mỗi document
        {
          $group: {
            _id: null, //không phân nhóm theo bất kỳ trường nào, có nghĩa là gom chung lại và tính tổng của trường applicationsCount
            totalApplication: { $sum: "$applicationsCount" },
          },
        },
      ])
      .toArray();
    //Nếu không có bất kỳ document nào thỏa mãn diều kiện thì result rỗng nên trả về 0 cho trạng thái của đơn trong thời
    //gian đã cho
    return result.length > 0 ? result[0].totalApplication : 0;
  }

  //Hàm thống kế số lượng đơn nộp trong tuần này
  async getTotalApplicationsInWeek() {
    //Giả sử trước
    // const startDate = new Date(2024, 9 - 1, 1);
    // const endDate = new Date(2024, 11 - 1, 20);
    // //Đếm số lượng trong khoảng thời gian này
    // const count = await this.countApplicationInDuration(0, startDate, endDate);
    // console.log("So luong la: " + count);

    //Lấy ngày hiện tại
    const currentDate = new Date();
    //Lấy ngày đầu tuần và cuối tuần của ngày hiện tại
    const startDateOfWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); //đầu tuần bắt đầu t2
    const endDateOfWeek = endOfWeek(currentDate, { weekStartsOn: 1 }); //Cuối tuần kết thúc chủ nhật
    //Lấy các ngày trong một tuần này
    const dateInterval = eachDayOfInterval({
      start: startDateOfWeek,
      end: endDateOfWeek,
    });
    //Mảng lưu trữ kết quả ngày và số lượng theo trạng thái
    const stats = [];

    for (let date of dateInterval) {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);
      const formattedStart = format(startDate, "dd/MM");
      // const formattedEnd = format(endDate, "dd-MM-yyyy");
      //Đếm số lượng mỗi ngày
      //Đếm số lượng đã nhận trong một ngày cụ thể
      const countReceivedInDay = await this.countApplicationInDuration(
        0,
        startDate,
        endDate
      );
      //Đếm số lượng đã chấp nhận trong một ngày cụ thể
      const countApprovedInDay = await this.countApplicationInDuration(
        1,
        startDate,
        endDate
      );
      //Đếm số lượng đã từ chối tron một ngày cụ thể
      const countRejectedInDay = await this.countApplicationInDuration(
        2,
        startDate,
        endDate
      );
      //Lấy tổng các đơn đã nhận bao gồm cả những cái đang xử lý, đã chấp nhận và đã từ chối
      const totalApplication =
        countReceivedInDay + countApprovedInDay + countRejectedInDay;
      //Tạo object để lưu trữ lại theo đơn theo tuần ngày và số lượng theo trạng thái
      const result = {
        label: formattedStart,
        receivedApplicationCount: totalApplication,
        approvedApplicationCount: countApprovedInDay,
        rejectedApplicationCount: countRejectedInDay,
      };
      stats.push(result);
    }
    return stats;
  }

  //Hàm đếm số lượng đơn trong tháng này
  async getTotalApplicationsInMonth() {
    //Lấy ngày hiện tại
    const now = new Date();
    //Lấy ngày bắt đầu và ngày kết thúc trong tháng hiện tại
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    //Lấy số lượng tuần trong tháng,
    //Có một số ngày chưa đủ một tuần thì nó sẽ lấy
    //các ngày lẻ của tháng trước hoặc sau bù vào thêm
    //Nên số tuần sẽ luôn lớn hơn 4
    const weeksInMonth = eachWeekOfInterval(
      { start: start, end: end },
      { weekStartsOn: 1 }
    );
    //Mảng lưu trữ kết quả thống kê
    const stats = [];

    for (let weekStart of weeksInMonth) {
      //weekStart là ngày bắt đầu trong tuần, có thể bao gồm
      //ngày bắt đầu của tuần trong tháng trước, bởi vì, sẽ có một vài
      //ngày trong tháng hiện tại không đủ 1 tuần nên nó lấy các ngày tháng trước bù qua
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      //Điều chỉnh lại ngày bắt đầu và kết thúc của tuần. Đối với những ngày không đủ một tuần thì
      //Thì gán lại chỉ lấy những ngày trong tuần thôi.
      const adjustedStart = weekStart < start ? start : weekStart;
      const adjustedEnd = weekEnd > end ? end : weekEnd;
      // Kiểm tra nếu số ngày của tuần không đủ 7
      //Tính toán khoảng cách giữa hai ngày cách bao nhiêu mili giây, chia cho (1000 * 60 * 60 * 24) để chuyển
      //mili giây sang ngày, sau đó so sánh với 6, nếu nhỏ hơn tức là không đủ 1 tuần
      const isPartialWeek =
        (adjustedEnd - adjustedStart) / (1000 * 60 * 60 * 24) < 6;

      //Đếm số đơn theo từng trạng thái
      const countReceivedInMonth = await this.countApplicationInDuration(
        0,
        adjustedStart,
        adjustedEnd
      );
      const countApprovedInMonth = await this.countApplicationInDuration(
        1,
        adjustedStart,
        adjustedEnd
      );
      const countRejectedInMonth = await this.countApplicationInDuration(
        2,
        adjustedStart,
        adjustedEnd
      );
      //Đếm tổng số đơn đã nhận gồm tất cả các trạng thái
      const totalApplication =
        countReceivedInMonth + countApprovedInMonth + countRejectedInMonth;
      //Tạo đối tưởng để lưu trữ giá trị tuần tuần trong tháng
      const result = {
        label: `${format(adjustedStart, "dd/MM")}-${format(
          adjustedEnd,
          "dd/MM"
        )}`,
        receivedApplicationCount: totalApplication,
        approvedApplicationCount: countApprovedInMonth,
        rejectedApplicationCount: countRejectedInMonth,
      };
      //Thêm vào mảng kết quả
      stats.push(result);
    }
    return stats;
  }

  //Hàm thống kê số dơn theo trạng thái trong năm nay
  async getTotalApplicationInYear() {
    //Lấy năm hiện tại
    const currentYear = new Date().getFullYear();
    //Lấy ngày bắt đầu và ngày kết thúc của năm hiện tại
    const startOfYearDate = new Date(currentYear, 0, 1); //Tháng 1 là index 0
    const endOfYearDate = new Date(currentYear, 11, 1); //Tháng 12 là index 11

    //Lấy danh sách các tháng trong năm
    const monthsInYear = eachMonthOfInterval(
      {
        start: startOfYearDate,
        end: endOfYearDate,
      },
      { weeksToDays: 1 }
    );

    //Mảng chứa kết quả thống kê
    const stats = [];

    //Lặp qua mỗi tháng và đém số lượng đơn theo các trạng thái
    for (let startMonthDate of monthsInYear) {
      //Lấy ngày kết thúc của tháng, bởi vì startMonthDate là ngày bắt đầu của tháng
      //mà ngày này là ngày cuối cùng của năm trước
      //Công thêm một ngày nữa để nó qua năm mới sau đó thì truy xuất
      //ngày cuối cùng của tháng đầu tiên trong năm mới
      const endMonthDate = endOfMonth(startMonthDate + 1);
      //Lấy tên tháng của ngày bắt đầu của tháng
      const monthNumber = addDays(startMonthDate, 1).getMonth() + 1;
      const monthName = `Tháng ${monthNumber}`;

      //Đếm số lượng từng trạng thái đơn trong từng tháng
      const countReceived = await this.countApplicationInDuration(
        0,
        startMonthDate,
        endMonthDate
      );
      const countApproved = await this.countApplicationInDuration(
        1,
        startMonthDate,
        endMonthDate
      );
      const countRejected = await this.countApplicationInDuration(
        2,
        startMonthDate,
        endMonthDate
      );

      //Lấy tổng số các đơn trong tháng bao gồm tất cả trạng thái
      const totalApplications = countReceived + countApproved + countRejected;

      //Tạo đối tượng để lưu trữ giá trị
      const result = {
        label: monthName,
        receivedApplicationCount: totalApplications,
        approvedApplicationCount: countApproved,
        rejectedApplicationCount: countRejected,
      };

      //Thêm vào mảng kết quả
      stats.push(result);
    }

    return stats;
  }

  async getRecruitmentArea() {
    //Số lượng công ty
    //số lượng công việc mới
    const result = await this.jobpostings
      .aggregate([
        {
          $group: {
            _id: "$workLocation", //Nhóm theo nơi làm việc
            jobpostingCount: { $sum: 1 },
            uniqueCompanyIds: { $addToSet: "$companyId" }, //thu thập các companyId duy nhất trong mỗi nhóm
            //$addToSet dùng để tạo một mảng chứa phần tử không trùng nhau, nó sẽ bỏ qua những phần tử trùng
          },
        },
        {
          $addFields: {
            companyCount: { $size: "$uniqueCompanyIds" },
            location: "$_id",
          },
        },
        {
          $project: {
            _id: 0,
            uniqueCompanyIds: 0,
          },
        },
      ])
      .toArray();

    return result.length > 0 ? result : [];
  }
}

module.exports = AdminService;
