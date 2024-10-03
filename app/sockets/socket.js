const { Server } = require("socket.io");
const { isValidToken } = require("../utils/socket-method.util");
const connectionHandler = require("./connection.handler");
const disconnectHandler = require("./disconnect.handler");
const { jobpostingHandler } = require("./jobposting.handler");
const { messageHandler } = require("./message.handler");

const jwt = require("jsonwebtoken");
const activeUsers = [];

const setupSocket = (httpServer) => {
  const io = new Server(httpServer, {
    pingInterval: 25000, // Ping every 25 seconds
    ingTimeout: 60000, // Timeout after 60 seconds if no pong is received
  });
  //Middleware để kiểm soát các incomming connection đến socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const isEmployer = socket.handshake.auth.isEmployer ?? false;
    console.log(`Received token: ${token}`);

    if (isValidToken(token)) {
      console.log("Token is valid");
      console.log("Adding this user to activeUser list in Socket Middleware");
      //Giải mã token của người dùng để lấy id của loại người dùng
      const userId = jwt.decode(token)._id;
      const socketId = socket.id;
      const userInfo = {
        userId: userId,
        socketId: socketId,
        isEmployer: isEmployer,
      };
      //Lưu thông tin id người dùng vào các danh sách active tương ứng
      activeUsers.push(userInfo);
      //HIển thị danh sách active hiện tại
      console.log("activeUsers: ");
      console.log(activeUsers);
      return next();
    }
    return next(new Error("Authentication Error"));
  });

  //Sự kiện connection của Socket.io
  io.on("connection", (socket) => {
    //Hàm xử lý sự kiện kết nối, quan sát kết nối
    connectionHandler(socket);

    //Hàm xử lý sự kiện ngắt kết nối
    disconnectHandler(socket, activeUsers);

    //Hàm xử lý sự kiện tin nhắn
    messageHandler(io, socket, activeUsers);
  });

  //Mongodb change Stream setup
  jobpostingHandler(io);

  return io;
};

module.exports = setupSocket;
