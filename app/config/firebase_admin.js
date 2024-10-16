// firebase.js
const admin = require("firebase-admin");

try {
  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // uses GOOGLE_APPLICATION_CREDENTIALS environment variable
  });
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK: ", error);
}

module.exports = admin;
