const trainService = require("../services/trainService");
async function searchTrains(req, res, next) {
    try {
        const { source, destination, date } = req.query;
        const trains = await trainService.searchTrains(
            source,
            destination,
            date
        );
        res.status(200).json({
            success: true,
            count: trains.length,
            trains
        });
    } catch (error) {
        next(error);
    }
}
module.exports = {
    searchTrains
};
