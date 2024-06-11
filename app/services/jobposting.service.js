const { ObjectId, ReturnDocument } = require("mongodb");

class JobpostingService {
  constructor(client) {
    this.jobpostings = client.db().collection("jobpostings");
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
      companyId: ObjectId.createFromHexString(payload.companyId), //?ID công ty
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
  //Hàm lấy bài viết theo ID
  async getJobpostingById(id) {
    return await this.jobpostings.findOne({ _id: new ObjectId(id) });
  }
  //Hàm lấy tất cả bài viết còn hạn nộp
  async getJobpostingByDeadline() {
    return await this.jobpostings
      .find({ deadline: { $gte: new Date() } })
      .toArray();
  }
}

module.exports = JobpostingService;
