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
async function getSeatAvailability(req, res, next) {
    try {
        const { runId } = req.params;
        const { source, destination, coachType } = req.query;
        const availability =
            await trainService.getSeatAvailability(
                runId,
                source,
                destination,
                coachType
            );
        res.status(200).json({
            success: true,
            ...availability
        });
    } catch (error) {
        next(error);
    }
}
module.exports = {
    searchTrains,
    getSeatAvailability
};
