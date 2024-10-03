const express = require("express");
const conversation = require("../controllers/conversation.controller");
const router = express.Router();

//API tạo mới một cuộc trò chuyện giữa jobseeker và employer,
//Nó nhận vào id của jobseeker và id của company để tạo mới một conversation,
//server tự động truy xuất id của employer dựa vào companyId
router.route("/").post(conversation.createConversation);
//API lấy ra một conversation giữa jobseeker và employer cụ thể,
//query có 2 tham số jobseekerId và employerId
router.route("/by-user").get(conversation.getConversationByUserId); //Có truy xuất query jobseekerId và employerId
//API lấy ra một conversation giữa jobseeker và company cụ thể,
//query có 2 tham số jobseekerId và companyId
//nó tự động truy xuất ra employerId dựa vào companyId và sau đó kiểm tra
//Có cuộc hội thoại giữa jobseeker và employer của công ty này không?
router.route("/participants").get(conversation.getConversationByParticipantId);
//Hàm lấy tất các conversation của một jobseeker nhất định, bao gồm thông tin của
//conversation và danh sách tin nhắn trong conversation đó
router
  .route("/jobseeker/:jobseekerId")
  .get(conversation.findAllConversationByJobseekerId);
//Hàm lấy tất các conversation của một employer nhất định, bao gồm thông tin của
//conversation và danh sách tin nhắn trong conversation đó
router
  .route("/employer/:employerId")
  .get(conversation.findAllConversationByEmployerId);
//API tạo mới một tin nhắn trong một conversation cụ thể,
//Nó nhận vào các thuộc tính cụ thể của tin nhắn
router.route("/message").post(conversation.createMessage);
//API lấy ra tất cả tin nhắn trong một conversation cụ thể,
//nhận vào một param là conversationId
router
  .route("/message/:conversationId")
  .get(conversation.getAllMessageByConversationId);

//API đánh dấu đã đọc tin nhắn của một người dùng cụ thể
router.route("/mark-as-read").patch(conversation.markConversationAsRead);
//API lấy ra một conversation cụ thể dựa vào id của conversation
router.route("/:id").get(conversation.getConversationById);

module.exports = router;
