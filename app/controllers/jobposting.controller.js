const JobpostingService = require("../services/jobposting.service");
const CompanyService = require("../services/company.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

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
  try {
    const jobpostingService = new JobpostingService(MongoDB.client);
    const posts = await jobpostingService.findById(id);
    if (posts) {
      return res.send(posts);
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
    if (favoritePost) {
      return res.send(favoritePost);
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
