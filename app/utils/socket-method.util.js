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

module.exports = { isValidToken };
