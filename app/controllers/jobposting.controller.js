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
