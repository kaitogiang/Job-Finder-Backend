const express = require("express");
const jobposting = require("../controllers/jobposting.controller");

const router = express.Router();

router.route("/create").post(jobposting.createPost);
router.route("/company/:companyId").get(jobposting.getAllCompanyPost);
router.route("/").get(jobposting.getNotExperiedJobposting);
router.route("/all").get(jobposting.getAllJobpostingsIncludeExpired);
router
  .route("/all/favorite-numbers")
  .get(jobposting.getFavoriteNumberOfAllJobpostings);
router.route("/recent").get(jobposting.getRecentJobpostings);

router.route("/suggestJob/:userId").get(jobposting.suggestJob);

router
  .route("/:postId")
  .get(jobposting.getPostById)
  .patch(jobposting.updatePost)
  .delete(jobposting.deletePost);

router
  .route("/:postId/favorite-number")
  .get(jobposting.getFavoriteNumberOfJobposting);

router
  .route("/user/:userId/favorite")
  .post(jobposting.addFavoritePost)
  .get(jobposting.getFavoritePost)
  .patch(jobposting.removeFavoritePost);
module.exports = router;
