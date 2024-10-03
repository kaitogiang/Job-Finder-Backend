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
      unseenJobseekerMessages: 0,
      unseenEmployerMessages: 0,
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
  if (!jobseekerId) {
    return next(new ApiError(400, "JobseekerId query is required"));
  }
  if (!employerId) {
    return next(new ApiError(400, "EmployerId query is required"));
  }
  try {
    //Khởi tạo các dịch vụ
    const conversationService = new ConversationService(MongoDB.client);
    const jobseekerService = new JobseekerService(MongoDB.client);
    const employerService = new EmployerService(MongoDB.client);

    //Kiểm tra jobseekerId và employerId có tồn tại hay không
    const jobseeker = await jobseekerService.findById(jobseekerId);
    const employer = await employerService.findById(employerId);
    if (!jobseeker) {
      return next(new ApiError(404, "JobseekerId not found"));
    }
    if (!employer) {
      return next(new ApiError(404, "EmployerId not found"));
    }
    const conversation = await conversationService.findConversationByUserId(
      jobseekerId,
      employerId
    );
    res.send(conversation);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while getting conversation")
    );
  }
};

//Hàm lấy thông tin của conversation dựa vào jobseekerId và companyId
//Khi gửi companyId vào thì server tự động truy xuất employerId dựa vào companyId
//Sau đó dựa vào cặp jobseekerId và employerId để truy xuất conversationId
exports.getConversationByParticipantId = async (req, res, next) => {
  const { companyId, jobseekerId } = req.query;
  if (!companyId) {
    return next(new ApiError(400, "CompanyId query is required"));
  }
  if (!jobseekerId) {
    return next(new ApiError(400, "JobseekerId query is required"));
  }
  try {
    const conversationService = new ConversationService(MongoDB.client);
    const jobseekerService = new JobseekerService(MongoDB.client);
    const companyService = new CompanyService(MongoDB.client);

    //kiểm tra jobseekerId và companyId có tồn tại hay không
    const jobseeker = await jobseekerService.findById(jobseekerId);
    const company = await companyService.findById(companyId);
    if (!jobseeker) {
      return next(new ApiError(404, "JobseekerId not found"));
    }
    if (!company) {
      return next(new ApiError(404, "CompanyId not found"));
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
    if (conversation == null) {
      return res.send({ conversation: null });
    }
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

// api/conversation/employer/:employerId
exports.findAllConversationByEmployerId = async (req, res, next) => {
  const { employerId } = req.params;
  //kiểm tra id có đúng định dạng không
  if (!ObjectId.isValid(employerId)) {
    return next(new ApiError(400, "EmployerId is not valid ObjectId"));
  }
  try {
    const conversationService = new ConversationService(MongoDB.client);
    const employerService = new EmployerService(MongoDB.client);
    //Kiểm tra xem có employerId này không?
    const employer = await employerService.findById(employerId);
    if (!employer) {
      return next(new ApiError(404, "EmployerId not found"));
    }
    const conversation =
      await conversationService.findAllConversationByEmployerId(employerId);
    res.send(conversation);
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while getting conversation")
    );
  }
};

exports.createMessage = async (req, res, next) => {
  const {
    conversationId,
    senderId,
    receiverId,
    messageText,
    senderIsJobseeker,
  } = req.body;
  //Kiểm tra sự đầy đủ của các trường bắt buộc
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

  if (senderIsJobseeker == null || senderIsJobseeker == undefined) {
    return next(new ApiError(400, "SenderIsJobseeker is required"));
  }

  //Kiểm tra kiểu dữ liệu của các trường
  if (typeof senderIsJobseeker !== "boolean") {
    return next(new ApiError(400, "SenderIsJobseeker must be a boolean"));
  }

  if (!ObjectId.isValid(conversationId)) {
    return next(new ApiError(400, "ConversationId is not valid ObjectId"));
  }

  if (!ObjectId.isValid(senderId)) {
    return next(new ApiError(400, "SenderId is not valid ObjectId"));
  }

  if (!ObjectId.isValid(receiverId)) {
    return next(new ApiError(400, "ReceiverId is not valid ObjectId"));
  }

  try {
    const conversationService = new ConversationService(MongoDB.client);
    //Kiểm tra xem tính chính xác giữa senderIsJobseeker và senderId,
    //nếu senderIsJobseeker là true thì kiểm tra id trong senderId có tồn tại
    //trong jobseekers collection không. Ngược lại nếu là false thì kiểm tra xem
    //Id có tồn tại trong employers collection không
    if (senderIsJobseeker) {
      const jobseekerService = new JobseekerService(MongoDB.client);
      const jobseeker = await jobseekerService.findById(senderId);
      if (!jobseeker) {
        return next(
          new ApiError(404, "Jobseeker not found in senderId property")
        );
      }
    } else {
      const employerService = new EmployerService(MongoDB.client);
      const employer = await employerService.findById(senderId);
      if (!employer) {
        return next(
          new ApiError(404, "Employer not found in senderId property")
        );
      }
    }
    //Kiểm tra xem conversationId có tồn tại hay không
    const conversation = await conversationService.findConversationById(
      conversationId
    );
    if (!conversation) {
      return next(new ApiError(404, "Conversation not found"));
    }

    //Tạo message mới
    const message = await conversationService.createMessage(req.body);

    res.send(message);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while creating message"));
  }
};

exports.getAllMessageByConversationId = async (req, res, next) => {
  const { conversationId } = req.params;
  //Kiểm tra xem conversationId có hợp lệ không
  if (!ObjectId.isValid(conversationId)) {
    return next(new ApiError(400, "ConversationId is not valid ObjectId"));
  }
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

exports.markConversationAsRead = async (req, res, next) => {
  //Lấy conversationId và userId gửi lên trong phần body
  const { conversationId, userId, userIsEmployer } = req.body;

  console.log("userIsEmployer: ", userIsEmployer);

  //Kiểm tra xem có gửi đủ thuộc tính cần không
  if (!conversationId) {
    return next(new ApiError(400, "conversationId is required"));
  }

  if (!userId) {
    return next(new ApiError(400, "userId is required"));
  }

  if (userIsEmployer == null) {
    return next(new ApiError(400, "userIsEmployer is required"));
  }

  //Kiểm tra xem id có hợp lệ không
  if (!ObjectId.isValid(conversationId)) {
    return next(new ApiError(400, "conversationId is not valid"));
  }

  if (!ObjectId.isValid(userId)) {
    return next(new ApiError(400, "userId is not valid"));
  }

  if (typeof userIsEmployer !== "boolean") {
    return next(new ApiError(400, "userIsEmployer requires boolean type"));
  }

  try {
    const conversationService = new ConversationService(MongoDB.client);
    const jobseekerService = new JobseekerService(MongoDB.client);
    const employerService = new EmployerService(MongoDB.client);
    //Kiểm tra xem conversationId và userId có tồn tại không
    const conversation = await conversationService.findConversationById(
      conversationId
    );
    const user = userIsEmployer
      ? await employerService.findById(userId)
      : await jobseekerService.findById(userId);
    if (!conversation) {
      return next(new ApiError(400, "Conversation is not existed"));
    }

    if (!user) {
      return next(new ApiError(400, "User is not existed"));
    }

    //Kiểm tra xem userId có trong conversation hay không
    const userInConversation =
      await conversationService.checkUserInConversation(conversationId, userId);
    if (!userInConversation) {
      return next(new ApiError(400, "User is not in a conversation"));
    }
    //Đánh dấu tin nhắn đã đọc từ phía người dùng tương ứng
    const markAsRead = await conversationService.markMessagesAsRead(
      conversationId,
      userId,
      userIsEmployer
    );
    if (markAsRead.sucess) {
      return res.send({ messageMarkedAsRead: true });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while creating message"));
  }
};
