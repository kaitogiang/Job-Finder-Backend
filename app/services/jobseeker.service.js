const bcrypt = require("bcryptjs");
const sharedServices = require("../utils/services.util");
const { ObjectId, ReturnDocument } = require("mongodb");

class JobseekerService {
  constructor(client) {
    this.jobseekers = client.db().collection("jobseekers");
    this.avatars = client.db().collection("avatars");
  }

  //Hàm trích xuất dữ liệu của jobseeker
  extractJobseekerData(payload) {
    const jobseeker = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      address: payload.address,
      resume: payload.resume,
      skills: payload.skills,
      experience: payload.experience,
      education: payload.education,
      avatarId: payload.avatarId,
      updatedAt: payload.updatedAt,
    };

    Object.keys(jobseeker).forEach(
      (key) => jobseeker[key] === undefined && delete jobseeker[key]
    );

    return jobseeker;
  }
  //Hàm extract file pdf
  extractResumeData(payload) {
    const resume = {
      filename: payload.filename,
      url: payload.url,
      uploadDate: payload.uploadDate,
    };
    Object.keys(resume).forEach(
      (key) => resume[key] === undefined && delete resume[key]
    );

    return resume;
  }

  //Hàm đăng ký tài khoản mới cho người tìm việc
  async signUp(payload) {
    //Thiết lập avatar mặc định cho người dùng mới tạo
    const avatarId = new ObjectId("665059e1fdf21b71669818bf");
    const jobseeker = this.extractJobseekerData({
      ...payload,
      avatarId,
      resume: [],
      skills: [],
      experience: [],
      education: [],
    });
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
    const result = await this.jobseekers
      .aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(id),
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: "avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        {
          $unwind: "$avatar",
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            address: 1,
            resume: 1,
            skills: 1,
            experience: 1,
            education: 1,
            avatar: "$avatar.avatarLink",
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();
    return result.length > 0 ? result[0] : null;
  }

  //Hàm cập nhật thông tin cá nhân
  async updateProfile(id, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    //Thực hiện việc upload avatar vào collection avatars
    let avatarId;
    if (payload.avatarFileName && payload.avatarLink) {
      const avatarDoc = {
        avatarName: payload.avatarFileName,
        avatarLink: payload.avatarLink,
      };
      const avatar = await this.avatars.insertOne(avatarDoc);
      //Tạo ObjectId cho avatar vừa mới tạo và cập nhật lại cho jobseeker
      avatarId = avatar.insertedId;
    }

    //Thực hiện cập nhật thông tin jobseeker
    const update = this.extractJobseekerData({
      ...payload,
      avatarId: avatarId ?? undefined,
      updatedAt: new Date().toISOString(),
    });

    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: "after" }
    );

    return result;
  }
  //Thêm kỹ năng mới vào mảng
  async addSkill(user, skill) {
    //Kiểm tra xem skill này đã tồn tải chưa, toán tử $elemMatch dùng để  truy vấn các mảng nhúng bên trong
    //document. Dùng để truy vấn mảng bên trong một document như so sánh
    const isSkillExist = user.skills.some(
      (sk) => sk.toLowerCase() === skill.toLowerCase()
    ); //Trả về true nếu tìm thấy giá trị tồn tại, còn lại là false
    if (isSkillExist) {
      return isSkillExist;
    }
    //Nếu skill chưa tồn tại thì thêm vào
    const result = await this.jobseekers.findOneAndUpdate(
      { _id: user._id },
      { $push: { skills: skill } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result;
  }

  //Hàm link ảnh đại diện của người dùng
  async getAvatarLink(id) {}

  //Xóa một kỹ trong mảng
  async removeSkill(user, skill) {
    //Xóa skill
    const result = await this.jobseekers.findOneAndUpdate(
      { _id: user._id },
      { $pull: { skills: skill } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result;
  }

  //TODO: Hàm thêm nhiều skill
  async addSkills(user, skills) {
    const originalSkills = user.skills.map((item) => item.toLowerCase());
    const newSkills = skills.map((item) => item.toLowerCase());
    //Kiểm tra xem skill có trùng lại không
    const isSkillExist = newSkills.some((item) =>
      originalSkills.includes(item)
    );
    if (isSkillExist) {
      return isSkillExist;
    }
    const result = await this.jobseekers.findOneAndUpdate(
      { _id: user._id },
      { $push: { skills: { $each: skills } } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result;
  }

  //todo Hàm upload file pdf
  async uploadPdf(id, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const cv = this.extractResumeData({
      ...payload,
      uploadDate: new Date().toISOString(),
    });
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: { resume: [cv] } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result["resume"];
  }
}

module.exports = JobseekerService;
