const bcrypt = require("bcryptjs");
const sharedServices = require("../utils/services.util");
const { ObjectId, ReturnDocument } = require("mongodb");

class EmployerService {
  constructor(client) {
    this.client = client;
    this.employers = client.db().collection("employers");
    this.companies = client.db().collection("companies");
    this.avatars = client.db().collection("avatars");
    // this.lockedUsers = client.db().collection("locked_users");
    this.lockedEmployers = client.db().collection("locked_employers");
  }

  //Hàm trích xuất dữ liệu của Company
  extractCompanyData(payload) {
    const company = {
      companyName: payload.companyName,
      companyEmail: payload.companyEmail,
      companyPhone: payload.companyPhone,
      companyAddress: payload.companyAddress,
      description: payload.description,
      website: payload.website,
      avatarId: payload.companyAvatarId,
    };

    Object.keys(company).forEach(
      (key) => company[key] === undefined && delete company[key]
    );
    return company;
  }
  //Hàm trích xuất dữ liệu của Employer
  extractEmployerData(payload) {
    const employer = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      address: payload.address,
      role: payload.role,
      avatarId: payload.avatarId,
      updatedAt: payload.updatedAt,
    };

    Object.keys(employer).forEach(
      (key) => employer[key] === undefined && delete employer[key]
    );

    return employer;
  }

  extractLockedEmployerData(payload) {
    const lockedEmployer = {
      userId: ObjectId.isValid(payload.userId)
        ? ObjectId.createFromHexString(payload.userId)
        : null,
      userType: payload.userType,
      reason: payload.reason,
      lockedAt: payload.lockedAt ?? new Date().toISOString(),
    };

    Object.keys(lockedEmployer).forEach(
      (key) => lockedEmployer[key] === undefined && delete lockedEmployer[key]
    );

    return lockedEmployer;
  }

  async signUp(payload) {
    const avatarId = new ObjectId("665059e1fdf21b71669818bf");
    const companyAvatarId = new ObjectId("66509252fdf21b71669818c6");
    const employeer = this.extractEmployerData({
      ...payload,
      avatarId,
    });
    const company = this.extractCompanyData({
      ...payload,
      companyAvatarId,
    });

    const now = new Date();
    //Tạo công ty
    const com = await this.companies.insertOne({
      ...company,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    const companyId = com.insertedId;
    //Tạo nhà tuyển dụng
    const empResult = await this.employers.insertOne({
      ...employeer,
      companyId: companyId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return empResult;
  }

  async signIn(payload) {
    const employer = await this.findByEmail(payload.email);
    if (!employer) {
      return employer;
    }
    const isPasswordCorrect = await this.comparePassword(
      payload.password,
      employer.password
    );
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

  async findById(id) {
    const result = await this.employers
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
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            address: 1,
            password: 1,
            role: 1,
            companyId: 1,
            avatar: "$avatar.avatarLink",
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();
    return result.length > 0 ? result[0] : null;
  }

  //Hàm tìm employer theo companyId
  async findEmployerByCompanyId(companyId) {
    const result = await this.employers
      .aggregate([
        {
          $match: {
            companyId: ObjectId.createFromHexString(companyId),
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
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            address: 1,
            password: 1,
            role: 1,
            companyId: 1,
            avatar: "$avatar.avatarLink",
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();
    return result.length > 0 ? result[0] : null;
  }

  //?Hàm dùng để chỉnh sửa profile của nhà tuyển dụng
  async updateProfile(id, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    //todo Thực hiện việc upload avatar vào collection avatars
    let avatarId;
    if (payload.avatarFileName && payload.avatarLink) {
      const avatarDoc = {
        avatarName: payload.avatarFileName,
        avatarLink: payload.avatarLink,
      };
      const avatar = await this.avatars.insertOne(avatarDoc);
      //Tạo ObjectId cho avatar vừa mới tạo và cập nhật lại cho employer
      avatarId = avatar.insertedId;
    }
    //todo Thực hiện cập nhật thông tin employer
    const update = this.extractEmployerData({
      ...payload,
      avatarId: avatarId ?? undefined,
      updatedAt: new Date().toISOString(),
    });

    const result = await this.employers.findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: "after" }
    );

    return result;
  }
  //? Hàm thay đổi email truy cập
  async changeEmail(id, newEmail) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const result = await this.employers.findOneAndUpdate(
      filter,
      { $set: { email: newEmail } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result["email"];
  }
  //? Hàm thay đổi mật khẩu
  async changePassword(id, newPassword) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const encryptPassword = await this.hashPassword(newPassword);
    const result = await this.employers.findOneAndUpdate(
      filter,
      { $set: { password: encryptPassword } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result;
  }

  //------PHẦN QUẢN LÝ DÀNH CHO ADMIN------
  async findAll() {
    const result = await this.employers
      .aggregate([
        {
          $lookup: {
            from: "avatars",
            localField: "avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        {
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            address: 1,
            password: 1,
            role: 1,
            companyId: 1,
            avatar: "$avatar.avatarLink",
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();
    return result;
  }

  async findAllRecent() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await this.employers
      .aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(oneWeekAgo).toISOString() },
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
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            address: 1,
            password: 1,
            role: 1,
            companyId: 1,
            avatar: "$avatar.avatarLink",
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();
    return result;
  }

  async findAllLocked() {
    return await this.lockedEmployers.find({}).toArray();
  }

  async checkLockedEmployer(userId) {
    const result = await this.lockedEmployers.findOne({
      userId: ObjectId.createFromHexString(userId),
    });
    return result ? true : false;
  }

  async findLockedEmployerById(userId) {
    const result = await this.lockedEmployers.findOne({
      userId: ObjectId.createFromHexString(userId),
    });
    return result;
  }

  async lockAccount(payload) {
    const lockedEmployer = this.extractLockedEmployerData(payload);
    const result = await this.lockedEmployers.insertOne(lockedEmployer);
    return {
      _id: result.insertedId,
      ...lockedEmployer,
    };
  }

  async unlockAccount(userId) {
    const result = await this.lockedEmployers.deleteOne({
      userId: ObjectId.createFromHexString(userId),
    });
    return result.deletedCount > 0;
  }

  //Hàm tìm kiếm thông tin company dựa vào employerId
  async findCompanyByEmployerId(employerId) {
    const result = await this.employers
      .aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(employerId),
          },
        },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "company",
          },
        },
        {
          $unwind: {
            path: "$company",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: "company.avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        {
          $unwind: {
            path: "$avatar",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            "company.avatar": "$avatar.avatarLink",
          },
        },
        {
          $replaceRoot: { newRoot: "$company" }, // Replaces the root with the company object
        },
      ])
      .toArray();
    console.log(result);
    return result.length > 0 ? result[0] : null;
  }
}

module.exports = EmployerService;
