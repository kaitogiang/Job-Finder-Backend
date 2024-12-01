const { ObjectId, ReturnDocument } = require("mongodb");
const sharedServices = require("../utils/services.util");

class ApplicationService {
  constructor(client) {
    this.applicationStorage = client.db().collection("application_storage");
    this.employers = client.db().collection("employers");
  }

  //Hàm trích xuất dữ liệu của Application
  extractApplicationStorageData(payload) {
    const applicationStorage = {
      jobId: ObjectId.isValid(payload.jobId)
        ? ObjectId.createFromHexString(payload.jobId)
        : undefined,
      deadline: payload.deadline,
      applications: payload.applications,
    };

    Object.keys(applicationStorage).forEach(
      (key) =>
        applicationStorage[key] === undefined && delete applicationStorage[key]
    );

    return applicationStorage;
  }

  async applyApplication(post, jobseeker, resumeLink) {
    //! _id của post đã là đối tượng ObjectId rồi
    const filter = {
      jobId: post._id,
    };

    // const resumeLink = jobseeker.resume[0]["url"];

    const now = new Date();

    const jobseekerApplication = {
      jobseekerId: jobseeker._id,
      name: jobseeker.firstName,
      email: jobseeker.email,
      phone: jobseeker.phone,
      resume: resumeLink,
      status: 0,
      submittedAt: now.toISOString(),
    };
    const result = await this.applicationStorage.findOneAndUpdate(
      filter,
      {
        $push: { applications: jobseekerApplication },
        $setOnInsert: {
          jobId: post._id,
          deadline: post.deadline,
        },
      },
      {
        upsert: true,
        returnDocument: ReturnDocument.AFTER,
      }
    );

    return result["applications"][result["applications"].length - 1];
  }

  async checkExistingApplication(jobId, jobseekerId) {
    const filter = {
      jobId: ObjectId.createFromHexString(jobId),
      "applications.jobseekerId": ObjectId.createFromHexString(jobseekerId),
    };
    return await this.applicationStorage.findOne(filter);
  }

  async sendEmailForEmployer(email, jobposting, jobseeker) {
    return await sharedServices.sendNotificationForEmployer(
      email,
      jobposting,
      jobseeker
    );
  }

  async findAllApplicationsByCompanyId(company) {
    const companyId = company._id;
    const result = await this.applicationStorage
      .aggregate([
        {
          $lookup: {
            from: "jobpostings",
            localField: "jobId",
            foreignField: "_id",
            as: "jobposting",
          },
        },
        {
          $unwind: "$jobposting",
        },
        {
          $match: {
            "jobposting.companyId": companyId,
          },
        },
        {
          $addFields: {
            "jobposting.company": company,
          },
        },
        {
          $sort: {
            deadline: -1,
          },
        },
      ])
      .toArray();

    return result;
  }

  //?Hàm lấy tất cả hồ sơ đã nộp của người dùng
  async findAllApplicationsByJobseeker(jobseekerId) {
    const result = await this.applicationStorage
      .aggregate([
        {
          $match: {
            "applications.jobseekerId":
              ObjectId.createFromHexString(jobseekerId),
          },
        },
        {
          $lookup: {
            from: "jobpostings",
            localField: "jobId",
            foreignField: "_id",
            as: "jobposting",
          },
        },
        {
          $unwind: "$jobposting",
        },
        {
          $lookup: {
            from: "companies",
            localField: "jobposting.companyId",
            foreignField: "_id",
            as: "jobposting.company",
          },
        },
        {
          $unwind: "$jobposting.company",
        },
        {
          $lookup: {
            from: "avatars",
            localField: "jobposting.company.avatarId",
            foreignField: "_id",
            as: "jobposting.company.avatar",
          },
        },
        {
          $unwind: "$jobposting.company.avatar",
        },
        {
          $addFields: {
            "jobposting.company.avatar":
              "$jobposting.company.avatar.avatarLink",
          },
        },
        {
          $sort: {
            deadline: -1,
          },
        },
        {
          $addFields: {
            applications: {
              $filter: {
                input: "$applications",
                as: "application",
                cond: {
                  $eq: [
                    "$$application.jobseekerId",
                    ObjectId.createFromHexString(jobseekerId),
                  ],
                },
              },
            },
          },
        },
      ])
      .toArray();

    console.log(result);
    return result;
  }

  //?Hàm cập nhật trạng thái của Application 1 là đậu, 2 là rớt
  async updateApplicationStatus(jobId, jobseekerId, status) {
    const filter = {
      jobId: ObjectId.isValid(jobId)
        ? ObjectId.createFromHexString(jobId)
        : null,
      "applications.jobseekerId": ObjectId.isValid(jobseekerId)
        ? ObjectId.createFromHexString(jobseekerId)
        : null,
    };

    const result = await this.applicationStorage.findOneAndUpdate(
      filter,
      {
        $set: {
          "applications.$.status": status,
        },
      },
      {
        returnDocument: ReturnDocument.AFTER,
      }
    );

    return result;
  }

  async sendEmailForJobseeker(jobposting, jobseeker, status) {
    return await sharedServices.sendNotificationForJobseeker(
      jobposting,
      jobseeker,
      status
    );
  }

  //? Hàm tìm kiếm employer dựa vào id của công ty
  async findEmployerByCompanyId(companyId) {
    const filter = {
      companyId: ObjectId.isValid(companyId)
        ? ObjectId.createFromHexString(companyId)
        : null,
    };
    const employer = await this.employers
      .aggregate([
        {
          $match: filter,
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
          $addFields: {
            avatar: "$avatar.avatarLink",
          },
        },
      ])
      .toArray();
    return employer[0];
  }

  //-----DỊCH VỤ CHO ADMIN
  //hàm dùng để lấy tất cả các application ở tất cả các công ty
  async findAllApplications() {
    const result = await this.applicationStorage
      .aggregate([
        {
          //Join với collection jobposting dựa vào jobId của collection applicationStorage
          $lookup: {
            from: "jobpostings",
            localField: "jobId",
            foreignField: "_id",
            as: "jobposting",
          },
        },
        //Sau khi join thì thuộc tính jobposting sẽ nằm ở root và nó một mảng chứa kết quả, dù chỉ có một item thì vẫn là mảng
        //nên dùng stage $unwind để phân giải mảng thành mỗi phần tử là một document và các thuộc tính chung thì giống nhau
        //giữa các document
        {
          $unwind: "$jobposting",
        },
        //sau khi unwind rồi thì thuộc tính jobposting ở root chứa object của collection đã join
        //dựa vào companyId của jobposting, tiếp tục join với companies collection
        {
          $lookup: {
            from: "companies",
            localField: "jobposting.companyId",
            foreignField: "_id",
            as: "company",
          },
        },
        //Sau khi join xong thuộc tính company nằm ở gốc giống như jobposting và cũng là mảng nên cần phân giải
        {
          $unwind: "$company",
        },
        //Lúc này jobposting và company nằm ở root, tiếp theo là join với avatars collection dựa vào avatarId
        //mà avatarId này trong đối tượng nằm trong thuộc tính company nên truy xuất là company.avatarId
        {
          $lookup: {
            from: "avatars",
            localField: "company.avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        //sau khi join xong thì avatar sẽ nằm ở root giống jobposting và company và cũng là mảng nên cần phân giải ra
        {
          $unwind: "$avatar",
        },
        //Tiếp theo là thêm thuộc tính mới cho object nằm trong thuộc tính jobposting ở root, thêm thuộc tính company
        //có giá trị là object nằm trong thuộc tính company nằm ở root. Dùng ký hiệu $ tham chiếu đến giá trị trong document
        //$company dùng để tham chiếu đến giá trị của thuộc tính company trong document
        {
          $addFields: {
            "jobposting.company": "$company",
          },
        },
        //Sau khi thêm xong company, tiếp tục thêm vào sâu bên trong của thuộc tính company của jobposting
        {
          $addFields: {
            "jobposting.company.avatar": "$avatar.avatarLink",
          },
        },
        {
          $project: {
            company: 0, // Exclude the root-level company field
          },
        },
        {
          $sort: {
            deadline: -1,
          },
        },
      ])
      .toArray();

    return result.length > 0 ? result : [];
  }

  //Hàm truy xuất một ApplicationStorage dựa vào id, mỗi application storage tương với một jobposting
  async findApplicationsById(storageId) {
    const result = await this.applicationStorage
      .aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(storageId),
          }
        },
        {
          //Join với collection jobposting dựa vào jobId của collection applicationStorage
          $lookup: {
            from: "jobpostings",
            localField: "jobId",
            foreignField: "_id",
            as: "jobposting",
          },
        },
        //Sau khi join thì thuộc tính jobposting sẽ nằm ở root và nó một mảng chứa kết quả, dù chỉ có một item thì vẫn là mảng
        //nên dùng stage $unwind để phân giải mảng thành mỗi phần tử là một document và các thuộc tính chung thì giống nhau
        //giữa các document
        {
          $unwind: "$jobposting",
        },
        //sau khi unwind rồi thì thuộc tính jobposting ở root chứa object của collection đã join
        //dựa vào companyId của jobposting, tiếp tục join với companies collection
        {
          $lookup: {
            from: "companies",
            localField: "jobposting.companyId",
            foreignField: "_id",
            as: "company",
          },
        },
        //Sau khi join xong thuộc tính company nằm ở gốc giống như jobposting và cũng là mảng nên cần phân giải
        {
          $unwind: "$company",
        },
        //Lúc này jobposting và company nằm ở root, tiếp theo là join với avatars collection dựa vào avatarId
        //mà avatarId này trong đối tượng nằm trong thuộc tính company nên truy xuất là company.avatarId
        {
          $lookup: {
            from: "avatars",
            localField: "company.avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        //sau khi join xong thì avatar sẽ nằm ở root giống jobposting và company và cũng là mảng nên cần phân giải ra
        {
          $unwind: "$avatar",
        },
        //Tiếp theo là thêm thuộc tính mới cho object nằm trong thuộc tính jobposting ở root, thêm thuộc tính company
        //có giá trị là object nằm trong thuộc tính company nằm ở root. Dùng ký hiệu $ tham chiếu đến giá trị trong document
        //$company dùng để tham chiếu đến giá trị của thuộc tính company trong document
        {
          $addFields: {
            "jobposting.company": "$company",
          },
        },
        //Sau khi thêm xong company, tiếp tục thêm vào sâu bên trong của thuộc tính company của jobposting
        {
          $addFields: {
            "jobposting.company.avatar": "$avatar.avatarLink",
          },
        },
        {
          $project: {
            company: 0, // Exclude the root-level company field
          },
        },
        {
          $sort: {
            deadline: -1,
          },
        },
      ])
      .toArray();

    return result.length > 0 ? result[0] : null;
  }
}

module.exports = ApplicationService;
