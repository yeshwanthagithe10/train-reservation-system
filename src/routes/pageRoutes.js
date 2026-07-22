const express = require("express");
const pageController =
    require("../controllers/pageController");
const router = express.Router();
router.get("/", pageController.showHomePage);
module.exports = router;
