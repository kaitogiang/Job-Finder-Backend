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
    const insertedPost = await this.jobpostings.insertOne({
      ...jobposting,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    const result = await this.findById(insertedPost.insertedId.toString());

    return result;
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
    const result = await this.findById(id);
    return result;
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
          $addFields: {
            "company.avatar": "$company.avatar.avatarLink",
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

  //Hàm lấy tất cả bài tuyển dụng, bao gồm cả bài đã hết hạn
  async getAllJobpostingsIncludeExpired() {
    return await this.jobpostings
      .aggregate([
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

  //Hàm lấy các bài viết được tạo trong vòng 1 tuần
  async getRecentJobpostings() {
    const now = new Date();
    //Tính ngày 1 tuần trước
    //7 ngày * 24 giờ * 60 phút * 60 giây * 1000 mili giây
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return await this.jobpostings
      .aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo.toISOString() }, //? Chỉ lấy các bài viết được tạo trong vòng 1 tuần
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

  async getFavoriteNumberOfJobposting(jobpostingId) {
    const result = await this.favoritePosts
      .aggregate([
        {
          $match: {
            posts: jobpostingId, //Lọc ra các document nào mà có phần tử trong mảng posts là jobpostingId
          },
        },
        {
          $unwind: "$posts", //Phân giải mảng posts ra, mỗi phần tử trong mảng là một document mới
          //Ví dụ: {jobseekerId: 1, posts: [1, 2, 3]} -> {jobseekerId: 1, posts: 1}, {jobseekerId: 1, posts: 2}, {jobseekerId: 1, posts: 3}
        },
        {
          $match: {
            posts: jobpostingId, //Lọc ra các document nào có thuộc tính posts là jobpostingId,
            //bây giờ posts không còn là mảng nữa vì đã phân giải, do đó nó chứa giá trị đơn
            //và giá trị này chính là jobpostingId
          },
        },
        {
          //Nhóm các document có cùng giá trị $posts và đếm số lượng của nó, sau đó
          //trả về một document duy nhất gồm có thuộc tính jobpostingId và count
          $group: {
            _id: "$posts", //Khi dùng group thì phải dùng _id để phân biệt các document
            //Nếu dùng thuộc tính khác làm key thì sẽ bị lỗi 'the field jobpostingId must be an accumlator object
            //Bởi vì, trong mongoDb trường _Id trong $group stage dùng để chỉ định khóa chính mà các document được nhóm
            count: { $sum: 1 }, //Tính tổng số lượng phần tử trong mảng posts
          },
        },
        {
          $project: {
            _id: 0,
            jobpostingId: "$_id",
            favoriteCount: "$count",
          },
        },
      ])
      .toArray();
    return result.length > 0 ? result[0] : { jobpostingId, favoriteCount: 0 };
  }

  async getFavoriteNumberOfAllJobpostings() {
    //lấy danh sách các jobpostingIds
    const jobpostings = await this.jobpostings.find().toArray();
    console.log(jobpostings);
    //Đếm số lượng lượng thích của từng bài đăng
    const jobpostingFavoriteCountList = [];
    for (const jobposting of jobpostings) {
      const jobpostingFavoriteCount = await this.getFavoriteNumberOfJobposting(
        jobposting._id.toString()
      );
      jobpostingFavoriteCountList.push(jobpostingFavoriteCount);
    }
    return jobpostingFavoriteCountList;
  }
}

module.exports = JobpostingService;
