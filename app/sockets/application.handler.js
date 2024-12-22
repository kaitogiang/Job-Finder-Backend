// const MongoDB = require("../utils/mongodb.util");
// const applicationService = require("../services/application.service");
const applicationHandler = (io, socket) => {
  //Lắng nghe sự kiện cập nhật dữ liệu cho Application từ ApplicationStorage
  socket.on("updateApplication", () => {
    //Khi nhận event này thì thông báo ngược lại cho client để gọi hàm
    // socket.emit("receiveApplicationUpdated");
    io.emit("receiveApplicationUpdated");
  });
};

module.exports = { applicationHandler };
