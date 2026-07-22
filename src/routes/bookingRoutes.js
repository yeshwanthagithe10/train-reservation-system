const express = require("express");
const bookingController =
    require("../controllers/bookingController");
const router = express.Router();
router.post("/", bookingController.createBooking);
router.get(
    "/:pnr",
    bookingController.getBookingByPnr
);
router.patch(
    "/:pnr/cancel",
    bookingController.cancelBooking
);
module.exports = router;
