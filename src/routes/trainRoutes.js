const express = require("express");
const trainController = require("../controllers/trainController");
const router = express.Router();
router.get("/search", trainController.searchTrains);
module.exports = router;
