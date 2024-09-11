const ConversationService = require("../services/conversation.service");
const CompanyService = require("../services/company.service");
const JobseekerService = require("../services/jobseeker.service");
const EmployerService = require("../services/employer.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const { ObjectId } = require("mongodb");

exports.createConversation = async (req, res, next) => {
  //Được tạo khi jobseeker nhấp vào mục chat của một
  //jobposting bất kỳ
  //Jobseeker sẽ gửi jobseekerId và compnayId,server
  //sẽ tự động truy xuất employerId từ companyId
  //sau đó tạo ra conversationId và lưu vào cơ sở dữ liệu
  const { jobseekerId, companyId } = req.body;
  if (!jobseekerId || !companyId) {
    return next(new ApiError(400, "JobseekerId and companyId are required"));
  }
  try {
    //Khởi tạo các dịch vụ liên quan
    const companyService = new CompanyService(MongoDB.client);
    const conversationService = new ConversationService(MongoDB.client);
    const jobseekerService = new JobseekerService(MongoDB.client);
    const employerService = new EmployerService(MongoDB.client);

    //Kiểm tra xem jobseekerId và companyId có tồn tại hay không
    const jobseeker = await jobseekerService.findById(jobseekerId);
    const company = await companyService.findById(companyId);
    if (!jobseeker) {
      return next(new ApiError(404, "Jobseeker not found"));
    }

    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    //Nếu company có tồn tại thì truy xuất employerId
    const employer = await employerService.findEmployerByCompanyId(companyId);
    //Tạo conversationId
    const conversation = await conversationService.createConversation({
      jobseekerId: jobseeker._id,
      employerId: employer._id,
      lastMessage: "",
      lastMessageTime: new Date(),
      unseenMessages: 0,
      createAt: new Date(),
      updateAt: new Date(),
    });
    res.send({ message: "Create conversation successfully", conversation });
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while creating conversation")
    );
  }
};

exports.getConversationById = async (req, res, next) => {
  const { id } = req.params;
  console.log(id);
  try {
    const conversationService = new ConversationService(MongoDB.client);
    const conversation = await conversationService.findConversationById(id);
    res.send(conversation);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while getting conversation")
    );
  }
};

exports.getConversationByUserId = async (req, res, next) => {
  const { jobseekerId, employerId } = req.query;
  console.log(jobseekerId, employerId);
  try {
    const conversationService = new ConversationService(MongoDB.client);
    const conversation = await conversationService.findConversationByUserId(
      jobseekerId,
      employerId
    );
    res.send(conversation);
  } catch (error) {
    console.log(error);
  }
};

//Hàm lấy thông tin của conversation dựa vào jobseekerId và companyId
//Khi gửi companyId vào thì server tự động truy xuất employerId dựa vào companyId
//Sau đó dựa vào cặp jobseekerId và employerId để truy xuất conversationId
exports.getConversationByParticipantId = async (req, res, next) => {
  const { companyId, jobseekerId } = req.query;
  try {
    const conversationService = new ConversationService(MongoDB.client);
    const jobseekerService = new JobseekerService(MongoDB.client);
    const companyService = new CompanyService(MongoDB.client);

    //kiểm tra jobseekerId và companyId có tồn tại hay không
    const jobseeker = await jobseekerService.findById(jobseekerId);
    const company = await companyService.findById(companyId);
    if (!jobseeker) {
      return next(new ApiError(404, "Jobseeker not found"));
    }
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    //Nếu có tồn tại thì truy xuất employerId
    const { employerId } = await companyService.getEmployerIdByCompanyId(
      companyId
    );
    if (!employerId) {
      return next(new ApiError(404, "Employer not found"));
    }
    const conversation =
      await conversationService.findConversationByParticipantId(
        jobseekerId,
        employerId
      );
    //nếu không tồn tại cuộc trò chuyện thì trả về null ngược lại trả về collection cuộc trò chuyện
    //giữa hai người
    res.send(conversation);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while getting conversation")
    );
  }
};

// api/conversation/jobseeker/:jobseekerId
exports.findAllConversationByJobseekerId = async (req, res, next) => {
  const { jobseekerId } = req.params;
  try {
    const conversationService = new ConversationService(MongoDB.client);
    const conversation =
      await conversationService.findAllConversationByJobseekerId(jobseekerId);
    res.send(conversation);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while getting conversation")
    );
  }
};

exports.createMessage = async (req, res, next) => {
  const { conversationId, senderId, receiverId, messageText } = req.body;
  if (!conversationId) {
    return next(new ApiError(400, "ConversationId is required"));
  }
  if (!senderId) {
    return next(new ApiError(400, "SenderId is required"));
  }
  if (!receiverId) {
    return next(new ApiError(400, "ReceiverId is required"));
  }
  if (!messageText) {
    return next(new ApiError(400, "MessageText is required"));
  }
  try {
    const conversationService = new ConversationService(MongoDB.client);

    if (!ObjectId.isValid(conversationId)) {
      console.log("Invalid conversationId: ", conversationId);
    }

    // Validate senderId
    if (!ObjectId.isValid(senderId)) {
      console.log("Invalid senderId: ", senderId);
    }

    // Validate receiverId
    if (!ObjectId.isValid(receiverId)) {
      console.log("Invalid receiverId: ", receiverId);
    }

    const message = await conversationService.createMessage(req.body);

    res.send(message);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while creating message"));
  }
};

exports.getAllMessageByConversationId = async (req, res, next) => {
  const { conversationId } = req.params;
  try {
    const conversationService = new ConversationService(MongoDB.client);
    const conversation = await conversationService.getMessagesByConversationId(
      conversationId
    );
    res.send(conversation);
  } catch (error) {
    console.log(error);
  }
};
