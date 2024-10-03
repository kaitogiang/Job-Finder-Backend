const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

function isValidToken(token) {
  dotenv.config();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    console.log("Isvalid token when the new connection comming: ", err);
    return false;
  }
}

function isUserInRoom(io, roomId, socketId) {
  const clients = io.sockets.adapter.rooms.get(roomId);
  // const numClients = clients ? clients.size : 0;
  if (clients && clients.has(socketId)) {
    console.log(`User with socketId: ${socketId} is in a room`);
    return true;
  } else {
    console.log(`User with socketId: ${socketId} is not in a room`);
    return false;
  }
}

module.exports = { isValidToken, isUserInRoom };
