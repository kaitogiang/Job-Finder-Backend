const { Server } = require("socket.io");
const { isValidToken } = require("../utils/socket-method.util");
const connectionHandler = require("./connection.handler");
const disconnectHandler = require("./disconnect.handler");
const { jobpostingHandler } = require("./jobposting.handler");

const setupSocket = (httpServer) => {
  const io = new Server(httpServer, {
    pingInterval: 25000, // Ping every 25 seconds
    ingTimeout: 60000, // Timeout after 60 seconds if no pong is received
  });
  //Middleware để kiểm soát các incomming connection đến socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log(`Received token: ${token}`);
    
    if (isValidToken(token)) {
      console.log("Token is valid");
      return next();
    }
    return next(new Error("Authentication Error"));
  });

  //Sự kiện connection của Socket.io
  io.on("connection", (socket) => {
    //Hàm xử lý sự kiện kết nối, quan sát kết nối
    connectionHandler(socket);
    //Hàm xử lý sự kiện ngắt kết nối
    disconnectHandler(socket);
  });

  //Mongodb change Stream setup
  jobpostingHandler(io);

  return io;
};

module.exports = setupSocket;
