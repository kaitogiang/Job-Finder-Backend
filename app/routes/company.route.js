const express = require("express");
const company = require("../controllers/company.controller");
const {
  uploadAvatar,
  uploadMultiImages,
  combinedImageUpload,
} = require("../config/multer.config");
const router = express.Router();

const uploadMiddleware = combinedImageUpload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

router
  .route("/:id")
  .patch(uploadMiddleware, company.updateCompany)
  .get(company.getCompany);

router.route("/:id/images").patch(uploadMultiImages, company.updateImages);
module.exports = router;
