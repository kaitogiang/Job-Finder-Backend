module.exports = (socket) => {
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
};
