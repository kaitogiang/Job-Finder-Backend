const ApplicationService = require("../services/application.service");
const JobpostingService = require("../services/jobposting.service");
const JobseekerService = require("../services/jobseeker.service");
const CompanyService = require("../services/company.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

//? Hàm gửi ứng tuyển cho nhà tuyển dụng
exports.applyApplication = async (req, res, next) => {
  const { jobId, jobseekerId, employerEmail } = req.body;
  if (!jobId) {
    return next(new ApiError(400, "jobId are required"));
  }
  if (!jobseekerId) {
    return next(new ApiError(400, "jobseekerId are required"));
  }
  if (!employerEmail) {
    return next(new ApiError(400, "EmployerEmail are required"));
  }

  try {
    //todo Khởi tạo các đối tượng dịch vụ
    const applicationService = new ApplicationService(MongoDB.client);
    const jobpostingService = new JobpostingService(MongoDB.client);
    const jobseekerService = new JobseekerService(MongoDB.client);
    //todo Sử dụng các dịch vụ đã định nghĩa
    const jobposting = await jobpostingService.findById(jobId);
    const jobseeker = await jobseekerService.findById(jobseekerId);
    if (!jobposting) {
      return next(new ApiError(400, "Invalid jobId"));
    }
    if (!jobseeker) {
      return next(new ApiError(400, "Invalid jobseekerId"));
    }
    const resume = jobseeker["resume"];
    if (!resume || resume.length == 0) {
      return next(new ApiError(400, "There's no cv link"));
    }
    const existingApplication =
      await applicationService.checkExistingApplication(jobId, jobseekerId);
    console.log(`Gia tri check: ${existingApplication}`);
    if (existingApplication) {
      return next(new ApiError(400, "You have already applied this job"));
    }

    const newApplication = await applicationService.applyApplication(
      jobposting,
      jobseeker
    );
    if (newApplication) {
      //? GỬi mail cho nhà tuyển dụng biết
      const sent = await applicationService.sendEmailForEmployer(
        employerEmail,
        jobposting,
        jobseeker
      );
      if (sent) {
        return res.send({
          message: "Send application successfully",
          application: newApplication,
        });
      }
    } else {
      return next(new ApiError(400, "Cannot send application"));
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while sending application")
    );
  }
};

exports.getAllCompanyApplications = async (req, res, next) => {
  const companyId = req.params.companyId;

  try {
    const companyService = new CompanyService(MongoDB.client);
    const applicationService = new ApplicationService(MongoDB.client);

    const company = await companyService.findById(companyId);
    if (!company) {
      return next(new ApiError(400, "Invalid companyId"));
    }

    const applications =
      await applicationService.findAllApplicationsByCompanyId(company);

    if (applications) {
      return res.send(applications);
    } else {
      return next(new ApiError(400, "Cannot get applications"));
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while sending application")
    );
  }
};

exports.getAllJobseekerApplication = async (req, res, next) => {
  const jobseekerId = req.params.jobseekerId;
  try {
    const jobseekerService = new JobseekerService(MongoDB.client);
    const applicationService = new ApplicationService(MongoDB.client);
    //todo Kiểm tra user có tồn tại không
    const jobseeker = await jobseekerService.findById(jobseekerId);
    if (!jobseeker) {
      return next(new ApiError(400, "Invalid jobseekerId"));
    }
    const applications =
      await applicationService.findAllApplicationsByJobseeker(jobseekerId);
    if (applications) {
      return res.send(applications);
    } else {
      return next(new ApiError(400, "Cannot get applications"));
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while sending application")
    );
  }
};

exports.updateStatus = async (req, res, next) => {
  const { jobseekerId, status } = req.body;
  const jobId = req.params.jobId;
  if (!jobId) {
    return next(new ApiError(400, "jobId are required"));
  }
  if (!jobseekerId) {
    return next(new ApiError(400, "jobseekerId are required"));
  }
  if (!status) {
    return next(new ApiError(400, "status are required"));
  }
  try {
    const applicationService = new ApplicationService(MongoDB.client);
    const jobpostingService = new JobpostingService(MongoDB.client);
    const jobseekerService = new JobseekerService(MongoDB.client);

    const jobposting = await jobpostingService.findById(jobId);
    const jobseeker = await jobseekerService.findById(jobseekerId);
    if (!jobposting) {
      return next(new ApiError(400, "Invalid jobId"));
    }
    if (!jobseeker) {
      return next(new ApiError(400, "Invalid jobseekerId"));
    }
    const updated = await applicationService.updateApplicationStatus(
      jobId,
      jobseekerId,
      status
    );
    if (updated) {
      //? Gửi thông báo cho ứng viên biết
      const sent = applicationService.sendEmailForJobseeker(
        jobposting,
        jobseeker,
        status
      );
      if (sent) {
        return res.send({
          message: "Update status successfully",
          application: updated,
        });
      }
    } else {
      return next(new ApiError(400, "Cannot update status"));
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while sending application")
    );
  }
};

exports.findEmployerByCompany = async (req, res, next) => {
  const companyId = req.params.companyId;
  try {
    const applicationService = new ApplicationService(MongoDB.client);
    const companyService = new CompanyService(MongoDB.client);
    const company = companyService.findById(companyId);
    if (!company) {
      return next(new ApiError(400, "Invalid companyId"));
    }
    const employer = await applicationService.findEmployerByCompanyId(
      companyId
    );
    if (employer) {
      return res.send(employer);
    } else {
      return next(new ApiError(400, "Cannot get applications"));
    }
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while sending application")
    );
  }
};

//----HÀM DÀNH CHO ADMIN -------------

exports.findAllApplications = async (req, res, next) => {
    try {
      const companyService = new CompanyService(MongoDB.client);
      const applicationService = new ApplicationService(MongoDB.client);
  
      const applications =
        await applicationService.findAllApplications();
  
      if (applications) {
        return res.send(applications);
      } else {
        return next(new ApiError(400, "Cannot get applications"));
      }
    } catch (error) {
      console.log(error);
      return next(
        new ApiError(500, "An error occured while sending application")
      );
    }
}

exports.findApplicationsById = async (req, res, next) => {
    const storageId = req.params.storageId;
    try {
      const companyService = new CompanyService(MongoDB.client);
      const applicationService = new ApplicationService(MongoDB.client);
  
      const applications =
        await applicationService.findApplicationsById(storageId);
  
      if (applications) {
        return res.send(applications);
      } else {
        return next(new ApiError(400, "Cannot get applications"));
      }
    } catch (error) {
      console.log(error);
      return next(
        new ApiError(500, "An error occured while sending application")
      );
    }
}

