module.exports = (socket, activeUsers) => {
  //Thêm sự kiện ngắt kết nối khi người dùng bị disconnect
  socket.on("disconnect", (reason) => {
    console.log(
      `User with id = ${socket.id} disconnected for the reasons: ${reason}`
    );
    for (const user of activeUsers) {
      if (user.socketId === socket.id) {
        const index = activeUsers.indexOf(user);
        if (index > -1) {
          activeUsers.splice(index, 1);
          console.log(
            `Remove the socketId: ${socket.id} from activeUsers array`
          );
        }
      }
    }
    //Hiển thị danh sách active còn lại
    console.log(activeUsers);
  });
};
