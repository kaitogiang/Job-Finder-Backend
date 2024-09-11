module.exports = (socket) => {
  //Thêm sự kiện ngắt kết nối khi người dùng bị disconnect
  socket.on("disconnect", (reason) => {
    console.log(
      `User with id = ${socket.id} disconnected for the reasons: ${reason}`
    );
  });
};
