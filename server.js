const httpServer = require("./app");
const config = require("./app/config");
const MongoDB = require("./app/utils/mongodb.util");
const setupSocket = require("./app/sockets/socket");
const admin = require("./app/config/firebase_admin");

async function StartServer() {
  try {
    await MongoDB.connect(config.db.uri);
    console.log("Server.js truoc");
    console.log("Connected to the database");
    const PORT = config.app.port;

    //Phần code của Socket.io
    setupSocket(httpServer);

    //Server lắng nghe yêu cầu
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log("Cannot connect to the database", error);
    process.exit;
  }
}

StartServer();
