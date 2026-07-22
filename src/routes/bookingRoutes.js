const express = require("express");
const bookingController =
    require("../controllers/bookingController");
const router = express.Router();
router.post("/", bookingController.createBooking);
router.patch(
    "/:pnr/cancel",
    bookingController.cancelBooking
);
module.exports = router;
