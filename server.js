const httpServer = require("./app");
const config = require("./app/config");
const MongoDB = require("./app/utils/mongodb.util");

async function StartServer() {
  try {
    await MongoDB.connect(config.db.uri);
    console.log("Connected to the database");
    const PORT = config.app.port;

    //Server lắng nghe yêu cầu
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log("Cannot connect to the database");
    process.exit;
  }
}

StartServer();
