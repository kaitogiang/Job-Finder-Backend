//Chuỗi kết nối database cũ khi không sử dụng replica set
//mongodb://127.0.0.1:27017/career_finder
const config = {
  app: {
    port: process.env.PORT || 3000,
  },
  db: {
    uri:
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/career_finder?replicaSet=rs0&serverSelectionTimeoutMS=90000",
  },
};

module.exports = config;
