const express = require("express");
const conversation = require("../controllers/conversation.controller");
const router = express.Router();

router.route("/").post(conversation.createConversation);
router.route("/by-user").get(conversation.getConversationByUserId); //Có truy xuất query jobseekerId và employerId
router.route("/participants").get(conversation.getConversationByParticipantId);
router
  .route("/jobseeker/:jobseekerId")
  .get(conversation.findAllConversationByJobseekerId);
router.route("/message").post(conversation.createMessage);
router
  .route("/message/:conversationId")
  .get(conversation.getAllMessageByConversationId);

router.route("/:id").get(conversation.getConversationById);

module.exports = router;
