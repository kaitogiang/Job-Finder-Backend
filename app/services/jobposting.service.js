const { ObjectId, ReturnDocument } = require("mongodb");

class JobpostingService {
  constructor(client) {
    this.jobpostings = client.db().collection("jobpostings");
    this.favoritePosts = client.db().collection("favorite_posts");
  }
  //Hàm trích xuất dữ liệu của Jobposting
  extractJobpostingData(payload) {
    const jobposting = {
      title: payload.title, //?Tiêu đề cho bài đăng "Senior Fullstack Developer"
      description: payload.description, //? Mô tả công việc
      requirements: payload.requirements, //? Yêu cầu công việc
      skills: payload.skills, //? Danh sách các ngôn ngữ lập trình
      workLocation: payload.workLocation, //? Vị trí làm việc HCM, VN
      workTime: payload.workTime, //? Thời gian làm việc (toàn thời gian, bán thời gian, linh hoạt, từ xa, vvv)
      level: payload.level, //? Trình độ (junior, senior, manager, vvv)
      benefit: payload.benefit, //?Quyền lợi được hưởng
      deadline: payload.deadline, //? Hạn chót ứng tuyển
      jobType: payload.jobType, //? Loại công việc (full-time, part-time, internship, vvv)
      salary: payload.salary, //? Mức lương
      contractType: payload.contractType, //?Loại hợp đồng
      experience: payload.experience, //? SỐ năm kinh nghiệm yêu cầu
      companyId: ObjectId.isValid(payload.companyId)
        ? ObjectId.createFromHexString(payload.companyId)
        : undefined, //?ID công ty
    };

    Object.keys(jobposting).forEach(
      (key) => jobposting[key] === undefined && delete jobposting[key]
    );

    return jobposting;
  }
  //Todo hàm tạo bài đăng mới
  async createJobposting(payload) {
    const jobposting = this.extractJobpostingData(payload);
    const now = new Date();
    return await this.jobpostings.insertOne({
      ...jobposting,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  //todo hàm xóa bài viết
  async deleteJobposting(id) {
    return await this.jobpostings.deleteOne({
      _id: ObjectId.createFromHexString(id),
    });
  }

  //todo Hàm chỉnh sửa bài viết
  async updateJobposting(id, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const jobposting = this.extractJobpostingData(payload);
    const now = new Date();
    const updatedPost = await this.jobpostings.findOneAndUpdate(
      filter,
      {
        $set: {
          ...jobposting,
          updatedAt: now.toISOString(),
        },
      },
      {
        returnDocument: ReturnDocument.AFTER,
      }
    );

    return updatedPost;
  }

  //Hàm lấy tất cả các bài viết trong cơ sở dữ liệu
  async getAllJobpostings() {
    return await this.jobpostings.find().toArray();
  }
  async getAllJobpostingsByCompany(companyId) {
    return await this.jobpostings
      .aggregate([
        {
          $match: {
            companyId: ObjectId.createFromHexString(companyId),
            // deadline: { $gte: new Date().toISOString().split("T")[0] },
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
          $unwind: "$company",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "company.avatarId",
            foreignField: "_id",
            as: "company.avatar",
          },
        },
        {
          $unwind: "$company.avatar",
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            requirements: 1,
            skills: 1,
            workLocation: 1,
            workTime: 1,
            level: 1,
            benefit: 1,
            deadline: 1,
            jobType: 1,
            salary: 1,
            contractType: 1,
            experience: 1,
            companyId: 1,
            createdAt: 1,
            updatedAt: 1,
            company: {
              _id: "$company._id",
              companyName: 1,
              companyEmail: 1,
              companyPhone: 1,
              companyAddress: 1,
              description: 1,
              images: 1,
              contactInformation: 1,
              policy: 1,
              avatar: "$company.avatar.avatarLink",
            },
          },
        },
      ])
      .toArray();
  }
  //Hàm lấy bài viết theo ID
  async findById(id) {
    const result = await this.jobpostings
      .aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(id),
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
      ])
      .toArray();
    return result.length > 0 ? result[0] : null;
  }
  //Hàm lấy tất cả bài viết còn hạn nộp
  async getJobpostingByDeadline() {
    // return await this.jobpostings
    //   .find({ deadline: { $gte: new Date().toISOString().split("T")[0] } })
    //   .toArray();
    return await this.jobpostings
      .aggregate([
        {
          $match: {
            deadline: { $gte: new Date().toISOString().split("T")[0] },
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
          $unwind: "$company",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "company.avatarId",
            foreignField: "_id",
            as: "company.avatar",
          },
        },
        {
          $unwind: "$company.avatar",
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            requirements: 1,
            skills: 1,
            workLocation: 1,
            workTime: 1,
            level: 1,
            benefit: 1,
            deadline: 1,
            jobType: 1,
            salary: 1,
            contractType: 1,
            experience: 1,
            companyId: 1,
            createdAt: 1,
            updatedAt: 1,
            company: {
              _id: "$company._id",
              companyName: 1,
              companyEmail: 1,
              companyPhone: 1,
              companyAddress: 1,
              description: 1,
              images: 1,
              contactInformation: 1,
              policy: 1,
              avatar: "$company.avatar.avatarLink",
            },
          },
        },
      ])
      .toArray();
  }

  //todo Hàm thêm yêu thích một post
  async addFavoriteJobposting(userId, jobpostingId) {
    console.log(jobpostingId);
    const filter = {
      jobseekerId: ObjectId.createFromHexString(userId),
    };
    const result = await this.favoritePosts.findOneAndUpdate(
      filter,
      {
        $push: { posts: jobpostingId },
        $setOnInsert: {
          jobseekerId: ObjectId.createFromHexString(userId),
        },
      },
      {
        upsert: true,
        returnDocument: ReturnDocument.AFTER,
      }
    );
    console.log(result);
    return result;
  }

  async removeFavoriteJobposting(userId, jobpostingId) {
    const filter = {
      jobseekerId: ObjectId.createFromHexString(userId),
    };
    const result = await this.favoritePosts.findOneAndUpdate(
      filter,
      {
        $pull: { posts: jobpostingId },
      },
      {
        returnDocument: ReturnDocument.AFTER,
      }
    );
    return result["posts"];
  }

  async getAllFavorite(userId) {
    const result = await this.favoritePosts.findOne({
      jobseekerId: ObjectId.createFromHexString(userId),
    });
    return result ? result["posts"] : null;
  }
}

module.exports = JobpostingService;
