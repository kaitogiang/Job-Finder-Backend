const { isUserInRoom } = require("../utils/socket-method.util");
const MongoDB = require("../utils/mongodb.util");
const ConversationService = require("../services/conversation.service");
const FirebaseService = require("../services/firebase.service");
const messageHandler = (io, socket, activeUsers) => {
  //Sự kiện xem user có trong một room nào không
  socket.on("checkRoom", (roomId) => {
    const isInRoom = isUserInRoom(roomId, socket.id);
    console.log("So luong client trong room la: ", isInRoom);
  });
  // Sự kiện này được kích hoạt khi một người dùng tham gia vào một phòng chat.
  // Nó sẽ thêm người dùng vào phòng chat được chỉ định và ghi lại sự kiện trong console.
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Sự kiện này được kích hoạt khi một người dùng rời khỏi một phòng chat.
  // Nó sẽ loại bỏ người dùng khỏi phòng chat được chỉ định và ghi lại sự kiện trong console.
  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    console.log(`User leave room: ${socket.id}`);
  });

  // Sự kiện này được kích hoạt khi một người dùng tạo một phòng chat mới.
  // Nó sẽ tìm kiếm người dùng nhận được trong danh sách người dùng đang hoạt động.
  // Nếu người dùng nhận được được tìm thấy, nó sẽ tìm kiếm cuộc trò chuyện bằng id phòng chat được chỉ định.
  // Sau đó, nó sẽ gửi cuộc trò chuyện mới đến người dùng nhận được qua socket.
  socket.on("createRoom", (conversation, receiverId) => {
    const userInActive =
      activeUsers.find((user) => user.userId === receiverId) ?? undefined;
    if (userInActive) {
      try {
        socket.to(userInActive.socketId).emit("receiveNewRoom", conversation);
      } catch (error) {
        console.log("Error in createRoom event of MessageHandler.js: ", error);
      }
    }
  });

  // Sự kiện này được kích hoạt khi một người dùng gửi tin nhắn.
  // Nó sẽ kiểm tra xem người dùng có đang trong phòng chat của cuộc trò chuyện không.
  // Nếu có, nó sẽ gửi tin nhắn đến tất cả người dùng trong phòng chat.
  // Nếu không, nó sẽ gửi tin nhắn trực tiếp đến người dùng được chỉ định.
  // Sau đó, nó sẽ cập nhật trạng thái tin nhắn của người gửi.
  socket.on("sendMessage", async (conversationId, userId, message) => {
    console.log("UserId trong sendMessage: ", userId);
    const userInActive =
      activeUsers.find((user) => user.userId === userId) ?? undefined;
    const userInRoom = isUserInRoom(io, conversationId, userInActive?.socketId);
    if (userInRoom) {
      console.log("Gui thong qua roomId");
      message.isRead = true;
      socket.to(conversationId).emit("receiveMessage", message);
      //Nếu cả hai người đều đang trong một room thì cập nhật lại trạng thái tin nhắn của người gửi
      try {
        const conversationService = new ConversationService(MongoDB.client);
        await conversationService.updateMessageStatus(
          message.conversationId,
          message._id
        );
      } catch (error) {
        console.log(
          "Error in conversationService at message.handler.js file: ",
          error
        );
      }
    } else if (userInActive) {
      console.log("Gui thong qua socket Id");
      socket.to(userInActive.socketId).emit("receiveMessage", message);
      const firebaseService = new FirebaseService(MongoDB.client);
      await firebaseService.sendMessageNotificationToDevice(message);
    } else {
      console.log("Emit su kien");
      const firebaseService = new FirebaseService(MongoDB.client);
      await firebaseService.sendMessageNotificationToDevice(message);
    }
  });
};

module.exports = { messageHandler };
