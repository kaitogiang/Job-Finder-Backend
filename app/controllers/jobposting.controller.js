const JobpostingService = require("../services/jobposting.service");
const CompanyService = require("../services/company.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const JobseekerService = require("../services/jobseeker.service");
const {
  haversine,
  searchProvince,
  findNearestProvince,
} = require("../utils/helper.method");

//todo phương thức dùng để tạo một bài viết mới
exports.createPost = async (req, res, next) => {
  const {
    title,
    description,
    requirements,
    skills,
    workLocation,
    workTime,
    level,
    benefit,
    salary,
    jobType,
    contractType,
    experience,
    deadline,
    companyId,
  } = req.body;
  //todo kiểm tra xem có nhập đầy đủ các trường chưa
  if (!title) {
    return next(new ApiError(400, "Title is required"));
  }
  if (!description) {
    return next(new ApiError(400, "Description is required"));
  }
  if (!requirements) {
    return next(new ApiError(400, "Requirements are required"));
  }
  if (!skills) {
    return next(new ApiError(400, "Skills are required"));
  }
  if (!workLocation) {
    return next(new ApiError(400, "WorkLocation is required"));
  }
  if (!workTime) {
    return next(new ApiError(400, "Work time is required"));
  }
  if (!level) {
    return next(new ApiError(400, "Level is required"));
  }
  if (!benefit) {
    return next(new ApiError(400, "Benefit is required"));
  }
  if (!salary) {
    return next(new ApiError(400, "Salary is required"));
  }
  if (!jobType) {
    return next(new ApiError(400, "Job type is required"));
  }
  if (!contractType) {
    return next(new ApiError(400, "Contract type is required"));
  }
  if (!experience) {
    return next(new ApiError(400, "Experience is required"));
  }
  if (!companyId) {
    return next(new ApiError(400, "Company id is required"));
  }
  if (!deadline) {
    return next(new ApiError(400, "Deadline is required"));
  }
  //todo tạo dịch vụ và tạo bài đăng mới
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const companyService = new CompanyService(MongoDB.client);
    //todo kiểm tra xem công ty có tồn tại không
    const company = await companyService.findById(companyId);
    if (!company) {
      return next(new ApiError(400, "Company not found"));
    }
    const newPost = await jobpostingService.createJobposting(req.body);
    if (newPost) {
      return res.send({ message: "Create post successfully", newPost });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while creating post"));
  }
};

exports.getAllPost = async (req, res, next) => {
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const posts = await jobpostingService.getAllJobpostings();
    if (posts) {
      return res.send(posts);
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting posts"));
  }
};

exports.getAllCompanyPost = async (req, res, next) => {
  const companyId = req.params.companyId;
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const posts = await jobpostingService.getAllJobpostingsByCompany(companyId);
    if (posts) {
      return res.send(posts);
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting posts"));
  }
};

exports.getNotExperiedJobposting = async (req, res, next) => {
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const posts = await jobpostingService.getJobpostingByDeadline();
    if (posts) {
      return res.send(posts);
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting posts"));
  }
};

exports.getPostById = async (req, res, next) => {
  const id = req.params.postId;
  console.log(id);
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const posts = await jobpostingService.findById(id);
    console.log(posts);
    if (posts) {
      return res.send(posts);
    } else {
      return next(new ApiError(400, "Post not found"));
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting posts"));
  }
};

exports.addFavoritePost = async (req, res, next) => {
  const userId = req.params.userId;
  const { jobpostingId } = req.body;
  if (!jobpostingId) {
    return next(new ApiError(400, "JobpostingId is required"));
  }
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const favoritePost = await jobpostingService.addFavoriteJobposting(
      userId,
      jobpostingId
    );
    if (favoritePost) {
      return res.send({
        message: "Add favorite post successfully",
        favoritePost,
      });
    } else {
      return next(new ApiError(400, "Cannot add favorite post"));
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while gettting posts"));
  }
};

exports.getFavoritePost = async (req, res, next) => {
  const userId = req.params.userId;
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const favoritePost = await jobpostingService.getAllFavorite(userId);
    console.log(favoritePost);
    if (favoritePost) {
      return res.send(favoritePost);
    } else {
      return res.send([]);
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while gettting posts"));
  }
};

exports.removeFavoritePost = async (req, res, next) => {
  const userId = req.params.userId;
  const { jobpostingId } = req.body;
  if (!jobpostingId) {
    return next(new ApiError(400, "JobpostingId is required"));
  }
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const favoritePosts = await jobpostingService.removeFavoriteJobposting(
      userId,
      jobpostingId
    );
    if (favoritePosts) {
      return res.send(favoritePosts);
    } else {
      return next(new ApiError(400, "Can not remove the favorite post"));
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while gettting posts"));
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  if (Object.keys(req.body) == 0) {
    return next(new ApiError(400, "Update cannot be empty"));
  }
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const updatedPost = await jobpostingService.updateJobposting(
      postId,
      req.body
    );
    if (updatedPost) {
      return res.send({ message: "updated post successfully", updatedPost });
    } else {
      return next(new ApiError(400, "Cannot update post"));
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while updating post"));
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const job = await jobpostingService.findById(postId);
    if (!job) {
      return next(new ApiError(400, "No jobposting found"));
    }
    const deletedJob = await jobpostingService.deleteJobposting(postId);
    if (deletedJob) {
      return res.send({ message: "deleted post successfully", deletedJob });
    } else {
      return next(new ApiError(400, "Cannot delete post"));
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while deleting post"));
  }
};

exports.getAllJobpostingsIncludeExpired = async (req, res, next) => {
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const posts = await jobpostingService.getAllJobpostingsIncludeExpired();
    return res.send(posts);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while gettting posts"));
  }
};

exports.getRecentJobpostings = async (req, res, next) => {
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const posts = await jobpostingService.getRecentJobpostings();
    return res.send(posts);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while gettting posts"));
  }
};

exports.getFavoriteNumberOfJobposting = async (req, res, next) => {
  const jobpostingId = req.params.postId;
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    //Kiểm tra xem bài viết có tồn tại không
    const jobposting = await jobpostingService.findById(jobpostingId);
    if (!jobposting) {
      return next(new ApiError(400, "Jobposting not found"));
    }
    const favoriteNumber =
      await jobpostingService.getFavoriteNumberOfJobposting(jobpostingId);
    return res.send(favoriteNumber);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while gettting favorite number")
    );
  }
};

exports.getFavoriteNumberOfAllJobpostings = async (req, res, next) => {
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const favoriteNumberList =
      await jobpostingService.getFavoriteNumberOfAllJobpostings();
    return res.send(favoriteNumberList);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occured while getting all favorite number")
    );
  }
};

//Hàm gợi ý công việc dựa vào vị trí, kỹ năng người dùng
exports.suggestJob = async (req, res, next) => {
  const userId = req.params.userId;
  try {
    //Định nghĩa các dịch vụ
    const jobseekerService = new JobseekerService(MongoDB.client);
    const jobpostingService = new JobpostingService(MongoDB.client);
    //Kiểm tra userId có tồn tại không
    const jobseeker = await jobseekerService.findById(userId);
    if (!jobseeker) {
      return next(new ApiError(400, "User is not found"));
    }
    //Lấy danh sách các bài tuyển dụng còn hạn
    const jobposting = await jobpostingService.getJobpostingByDeadline();
    //Tiến hành đề xuất cho jobseeker dựa vào các thông tin về profile của ứng viên
    //Lấy tỉnh/thành phố của jobseeker
    const jobseekerAddress = jobseeker.address;
    //Lấy tất cả tỉnh/thành phố của các bài tuyển dụng
    const jobpostingProvinces = [
      ...new Set(jobposting.map((job) => job.workLocation)),
    ];
    //Chuyển đổi mỗi province đạng chuỗi sang kiểu Province bao gồm tọa độ bên trong
    const provinceLocation = jobpostingProvinces.map((provinceString) =>
      searchProvince(provinceString)
    );
    //Trả về danh sách các tỉnh/thành phố cùng với khoảng cách của chúng đến
    //tỉnh/thành phố của ứng viên, các tỉnh/thành phố này sắp xếp
    //tăng dần theo khoảng cách
    const nearestProvince = provinceLocation
      .map((location) => {
        //Chuyển đổi tỉnh/thành phố của ứng viên sang kiểu có tọa độ
        const jobseekerLocation = searchProvince(jobseekerAddress);
        //Tính khoảng cách từ tỉnh/thành phố của ứng viên với tỉnh/thành phố của bài tuyển dụng
        const distance = haversine(jobseekerLocation, location);

        return {
          provinece: location.name,
          distance: distance,
        };
      })
      .sort((a, b) => a.distance - b.distance);
    //Ưu tiên chọn tìm công việc trong tỉnh/thành phố của ứng viên
    //Dựa vào khoảng cách tìm từ khoảng cách gần nhất đến xa nhất, chọn tối đa 9 cái phù hợp nhất với ứng viên
    //Có hai trường hợp, 1 là ứng viên đã thiết lập hồ sơ, dựa vào hồ sơ, nếu ứng viên chưa thiết lập hồ sơ thì chọn vị trí gần nhất
    //Xem xét các bài tuyển dụng ở gần ứng viên nhất
    let suggestJob = [];
    nearestProvince.forEach((location) => {
      const jobposingsInLocation = jobposting.filter(
        (jobpost) => jobpost.workLocation == location.provinece
      );
      suggestJob.push(...jobposingsInLocation);
    });
    //danh sách suggestJob chứa công việc gần ứng viên nhất đến xa nhất
    //jobBasedSkill là dùng để lọc ra những công việc có kỹ năng khớp với
    //kỹ năng của ứng viên từ gần nhất đến xa nhất
    //Nếu như jobBasedSKills là rỗng tức không khớp thì sẽ lấy các
    //công việc ở gần ứng viên nhất
    const jobBasedSkills = suggestJob.filter((jobpost) => {
      const hasMatchingSkills = jobpost.skills.some((requiredSkill) =>
        jobseeker.skills.includes(requiredSkill)
      );
      return hasMatchingSkills;
    });
    console.log("based skill: " + jobBasedSkills.length);
    let jobSet = new Set(jobBasedSkills);
    suggestJob.forEach((jobpost) => {
      jobSet.add(jobpost);
    });
    console.log(jobSet);
    return res.send([...jobSet]);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while suggesting job"));
  }
};
