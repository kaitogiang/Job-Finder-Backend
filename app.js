const express = require("express");
const path = require("path");
const cors = require("cors");
const ApiError = require("./app/api-error");
const morgan = require("morgan");
const { createServer } = require("http");

//Định nghĩa các controlller tại đây
const jobseekerController = require("./app/routes/jobseeker.route");
const employerController = require("./app/routes/employer.route");
const companyController = require("./app/routes/company.route");
const jobpostingController = require("./app/routes/jobposting.route");
const applicationController = require("./app/routes/application.route");
const conversationController = require("./app/routes/conversation.route");
//controller cho admin
const adminController = require("./app/routes/admin.route");
const setupSocket = require("./app/sockets/socket");
const app = express();
const httpServer = createServer(app);
// const io = new Server(httpServer);
//HTTP logger
app.use(morgan("combined"));

app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
//Tạo đường dẫn static để truy cập những file chung như ảnh đại diện, vv..vv
app.use(express.static(path.join(__dirname, "public")));

//Định tuyến các api
app.use("/api/jobseeker", jobseekerController);
app.use("/api/employer", employerController);
app.use("/api/company", companyController);
app.use("/api/jobposting", jobpostingController);
app.use("/api/application", applicationController);
app.use("/api/conversation", conversationController);
app.use("/api/admin", adminController);
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Job Finder DB" });
});
//Các middleware xử lý lỗi
app.use((req, res, next) => {
  return next(new ApiError(404, "Resourse not found"));
});

app.use((err, req, res, next) => {
  return res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
});

// //Phần code của Socket.io
// setupSocket(httpServer);

module.exports = httpServer;
