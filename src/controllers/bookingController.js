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
async function cancelBooking(req, res, next) {
    try {
        const { pnr } = req.params;
        const cancellation =
            await bookingService.cancelBooking(
                pnr,
                req.body
            );
        res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            cancellation
        });
    } catch (error) {
        next(error);
    }
}
module.exports = {
    createBooking,
    cancelBooking
};
