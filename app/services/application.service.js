const { ObjectId, ReturnDocument } = require("mongodb");
const sharedServices = require("../utils/services.util");

class ApplicationService {
  constructor(client) {
    this.applicationStorage = client.db().collection("application_storage");
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

  async applyApplication(post, jobseeker) {
    //! _id của post đã là đối tượng ObjectId rồi
    const filter = {
      jobId: post._id,
    };

    const resumeLink = jobseeker.resume[0]["url"];

    const jobseekerApplication = {
      jobseekerId: jobseeker._id,
      name: jobseeker.firstName,
      email: jobseeker.email,
      phone: jobseeker.phone,
      resume: resumeLink,
      status: 0,
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

  async findAllApplicationsByCompanyId(companyId) {
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
            "jobposting.companyId": ObjectId.createFromHexString(companyId),
          },
        },
      ])
      .toArray();

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
}

module.exports = ApplicationService;