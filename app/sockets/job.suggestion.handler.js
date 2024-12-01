const JobpostingService = require("../services/jobposting.service");
const JobseekerService = require("../services/jobseeker.service");
const MongoDB = require("../utils/mongodb.util");
const {
  haversine,
  searchProvince,
  findNearestProvince,
} = require("../utils/helper.method");

const jobSuggestionHandler = (io, socket) => {
  socket.on("suggestJob", async (userId) => {
    console.log("userId: " + userId);
    //Khởi tạo các dịch vụ
    const jobseekerService = new JobseekerService(MongoDB.client);
    const jobpostingService = new JobpostingService(MongoDB.client);
    //Lấy thông tin của ứng viên
    const jobseeker = await jobseekerService.findById(userId);
    const allJobposting = await jobpostingService.getAllJobpostings();
    const jobpostingProvinces = [
      ...new Set(allJobposting.map((job) => job.workLocation)),
    ];
    console.log("Jobseeker: " + jobseeker);
    const jobseekerProvince = searchProvince(jobseeker.address);

    console.log("Nearest Province la");
    console.log(nearestProvince);
  });
};

module.exports = { jobSuggestionHandler };
