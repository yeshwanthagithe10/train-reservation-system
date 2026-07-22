const express = require("express");
const stationController =
    require("../controllers/stationController");
const router = express.Router();
router.get("/", stationController.getAllStations);
module.exports = router;
