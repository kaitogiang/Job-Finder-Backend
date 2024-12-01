const MongoDB = require("../utils/mongodb.util");
const BehaviourService = require("../services/behaviour.service");
const BehaviorTypes = require("../utils/enum");

const behaviourHandler = (io, socket) => {
  //Lắng nghe từng hành vi của người dùng và thực hiện lưu trữ
  //lên database
  socket.on("viewJobPostAction", async (data) => {
    //Data là template dữ liệu cho hành động xem bài đăng
    try {
      const behaviourService = new BehaviourService(MongoDB.client);
      //lưu vào hệ thống hành vi người dùng
      const result = await behaviourService.observeBehaviors(data);
      if (result) {
        //emit lại sự kiện cập nhật gợi ý dựa vào hành vi người dùng
        console.log("The user is viewing a jobposting");
      }
    } catch (error) {
      console.log(
        "Error in viewJobPostAction event of behaviorHandler: " + error
      );
    }
  });
  //Lắng nghe hành động lưu bài đăng yêu thích của người dùng
  socket.on("saveJobPostAction", async (data) => {
    //Data là một object chứa các thuộc tính chung và một metaData khác nhau
    try {
      const behaviourService = new BehaviourService(MongoDB.client);
      //Lưu hành vi lưu bài đăng của người dùng vào hệ thống
      const result = await behaviourService.observeBehaviors(data);
      if (result) {
        //emit lại sự kiện cập nhật gợi ý cho người dùng
        console.log("The user has saved a jobposting");
      }
    } catch (error) {
      console.log("Error in saveJobPostAction: " + error);
    }
  });

  //Lắng nghe hành động tìm kiếm bài đăng của người dùng
  socket.on("searchJobPostAction", async (data) => {
    try {
      const behaviourService = new BehaviourService(MongoDB.client);
      //Lưu hành vi tìm kiếm bài đăng của người dùng lại
      const result = await behaviourService.observeBehaviors(data);
      if (result) {
        //Emit sự kiện cập nhật gợi ý người dùng
        console.log("The user have searched jobpostings");
      }
    } catch (error) {
      console.log("Error in searchJobPostAction event: " + error);
    }
  });

  //Lắng nghe hành động tìm kiếm công ty của người dùng
  socket.on("searchCompanyAction", async (data) => {
    try {
      const behaviourService = new BehaviourService(MongoDB.client);
      //Lưu hành vi tìm kiếm công ty của người dùng lại
      const result = await behaviourService.observeBehaviors(data);
      if (result) {
        //Emit sự kiện cập nhật gợi ý
        console.log("The user has searched a company");
      }
    } catch (error) {
      console.log("Error in searchCompanyAction event: " + error);
    }
  });

  //Lắng nghe hành động xem công ty của người dùng
  socket.on("viewCompanyAction", async (data) => {
    try {
      const behaviourService = new BehaviourService(MongoDB.client);
      //Lưu hành vi xem công ty của người dùng
      const result = await behaviourService.observeBehaviors(data);
      if (result) {
        //Emit sự kiện cập nhật gợi ý của người dùng
        console.log("The user has viewed a company");
      }
    } catch (error) {
      console.log("Error in viewCompanyAction: " + error);
    }
  });

  //Lắng nghe hành động lọc bài tuyển dụng của người dùng
  socket.on("filterJobPostAction", async (data) => {
    try {
      const behaviourService = new BehaviourService(MongoDB.client);
      //Lưu hành vi lọc bài tuyển dụng của người dùng lại
      const result = await behaviourService.observeBehaviors(data);
      if (result) {
        //Emit sự kiện cập nhật gợi ý của người dùng
        console.log("The user has filtered jobpostings");
      }
    } catch (error) {
      console.log("Error in filterJobPostAction event: " + error);
    }
  });
};

module.exports = { behaviourHandler };
