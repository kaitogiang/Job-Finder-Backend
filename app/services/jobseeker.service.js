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
      uploadedDate: payload.uploadedDate,
    };
    Object.keys(resume).forEach(
      (key) => resume[key] === undefined && delete resume[key]
    );

    return resume;
  }

  extractExperienceData(payload) {
    const experience = {
      role: payload.role,
      company: payload.company,
      duration: payload.from + " - " + payload.to,
    };

    Object.keys(experience).forEach(
      (key) => experience[key] === undefined && delete experience[key]
    );

    return experience;
  }

  extractEducationData(payload) {
    const education = {
      specialization: payload.specialization,
      school: payload.school,
      degree: payload.degree,
      startDate: payload.startDate,
      endDate: payload.endDate,
    };

    Object.keys(education).forEach(
      (key) => education[key] === undefined && delete education[key]
    );

    return education;
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
            password: 1,
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
      uploadedDate: new Date().toISOString(),
    });
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: { resume: [cv] } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result["resume"];
  }

  async removePdf(id) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: { resume: [] } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result["resume"];
  }

  async addExperience(id, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    //todo dữ liệu là from, to, role, company
    const exp = this.extractExperienceData(payload);
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $push: { experience: exp } },
      { returnDocument: ReturnDocument.AFTER }
    );

    return result["experience"];
  }

  //todo Hàm xóa một kinh nghiệm dựa vào chỉ số của nó
  async removeExperience(id, index) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const unsetObject = {};
    unsetObject[`experience.${index}`] = 1;

    await this.jobseekers.updateOne(filter, { $unset: unsetObject });

    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      {
        $pull: { experience: null },
      },
      { returnDocument: ReturnDocument.AFTER }
    );

    return result["experience"];
  }

  async findExperienceByIndex(id, index) {
    const result = await this.jobseekers
      .aggregate([
        { $match: { _id: ObjectId.createFromHexString(id) } },
        {
          $project: {
            experienceAtIndex: { $arrayElemAt: ["$experience", index] },
            _id: 0,
          },
        },
      ])
      .toArray();

    const exp = result[0]["experienceAtIndex"];
    const duration = exp["duration"];
    const indexSlash = duration.indexOf("-");
    const from = duration.substring(0, indexSlash);
    const to = duration.substring(indexSlash + 1, duration.length);
    exp.from = from;
    exp.to = to;
    return exp;
    // return result[0]["experienceAtIndex"];
  }

  async updateExperiece(id, index, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };

    const newExp = this.extractExperienceData(payload);
    console.log(newExp);
    const setObject = {};
    setObject[`experience.${index}`] = newExp;
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: setObject },
      { returnDocument: ReturnDocument.AFTER }
    );
    //! $unset dùng để xóa một trường còn $set dùng để cập nhật
    return result["experience"];
  }

  async addEducation(id, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const edu = this.extractEducationData(payload);
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $push: { education: edu } },
      { returnDocument: ReturnDocument.AFTER }
    );

    return result["education"];
  }

  async removeEducation(id, index) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const unsetObject = {};
    unsetObject[`education.${index}`] = 1;
    await this.jobseekers.updateOne(filter, { $unset: unsetObject });
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $pull: { education: null } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result["education"];
  }

  async updateEducation(id, index, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const newEdu = this.extractEducationData(payload);
    console.log(newEdu);
    const setObject = {};
    setObject[`education.${index}`] = newEdu;
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: setObject },
      { returnDocument: ReturnDocument.AFTER }
    );
    //! $unset dùng để xóa một trường còn $set dùng để cập nhật
    return result["education"];
  }

  async findEducationByIndex(id, index) {
    const result = await this.jobseekers
      .aggregate([
        { $match: { _id: ObjectId.createFromHexString(id) } },
        {
          $project: {
            educationAtIndex: { $arrayElemAt: ["$education", index] },
            _id: 0,
          },
        },
      ])
      .toArray();
    /*
        ! Trong $project thì $project dùng để cho biết những cột nào sẽ hiển thị
        ! khi kết hợp các bảng xong. Ở đây nó sẽ hiển thị một cột mới tên là 
        ! educationAtIndex và giá trị của nó sẽ là { $arrayElemAt: ["$education", index]} 
        ! Trong đó toán tử $arrayElemAt dùng để trả về phần tử tại chỉ số index trong mảng education,
        ! $education là đại diện cho mảng education trong jobseekers
         

          ??
      */
    return result[0]["educationAtIndex"];
  }

  async changeEmail(id, newEmail) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: { email: newEmail } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result["email"];
  }

  async changePassword(id, newPassword) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const encryptPassword = await this.hashPassword(newPassword);
    console.log("Haspassword la: " + encryptPassword);
    const result = await this.jobseekers.findOneAndUpdate(
      filter,
      { $set: { password: encryptPassword } },
      { returnDocument: ReturnDocument.AFTER }
    );

    return result;
  }
}

module.exports = JobseekerService;
