const bookingService =
    require("../services/bookingService");
async function createBooking(req, res, next) {
    try {
        const booking =
            await bookingService.createBooking(req.body);
        res.status(201).json({
            success: true,
            message: "Booking confirmed successfully",
            booking
        });
    } catch (error) {
        next(error);
    }
}
module.exports = {
    createBooking
};
