const { Server } = require("socket.io");
const { isValidToken } = require("../utils/socket-method.util");

const setupSocket = (httpServer) => {
  const io = new Server(httpServer, {
    pingInterval: 25000, // Ping every 25 seconds
    ingTimeout: 60000, // Timeout after 60 seconds if no pong is received
  });
  //Middleware để kiểm soát các incomming connection đến socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (isValidToken(token)) {
      console.log("Token is valid");
      return next();
    }
    return next(new Error("Authentication Error"));
  });

  //Sự kiện connection của Socket.io
  io.on("connection", (socket) => {
    console.log(`New user connected to Socket, id: ${socket.id}`);

    //Truy xuất vào inital transport
    console.log("Initial transport: ", socket.conn.transport.name);

    //Truy xuất transport sau khi đã upgrade lên một transport tốt hơn
    socket.conn.once("upgrade", () => {
      console.log("upgrade transport", socket.conn.transport.name);
    });

    //hiển thị các gói tin nhận được từ client
    socket.conn.on("packet", ({ type, data }) => {
      console.log(`Packet received: type: ${type}, data: ${data}`);
    });

    //Hiển thị các gói tin được gửi đi từ server
    socket.conn.on("packetCreate", ({ type, data }) => {
      console.log(`sending packet: type: ${type}, data: ${data}`);
    });

    //Xử lý lỗi khi có lỗi trong middleware
    socket.on("error", (err) => {
      console.log("Error: ", err.message);
    });

    //Thêm sự kiện ngắt kết nối khi người dùng bị disconnect
    socket.on("disconnect", (reason) => {
      console.log(
        `User with id = ${socket.id} disconnected for the reasons: ${reason}`
      );
    });
  });

  return io;
};

module.exports = setupSocket;
