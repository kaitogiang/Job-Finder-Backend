const companyHandler = (io, socket) => {
  //Lắng nghe sự kiện cập nhật danh sách công ty
  //Khi employer sửa thông tin thì sẽ truyền thông tin công ty đến
  //tất cả các Jobseeker
  socket.on("updateCompany", () => {
    //Khi nhận sự kiện cập nhật company thì emit sự kiện
    //cho tất cả Jobseeker cập nhật lại danh sách công ty
    io.emit("receiveUpdatedCompany");
  });
};

module.exports = { companyHandler };
