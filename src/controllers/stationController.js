const stationService =
    require("../services/stationService");
async function getAllStations(req, res, next) {
    try {
        const stations =
            await stationService.getAllStations();
        res.status(200).json({
            success: true,
            count: stations.length,
            stations
        });
    } catch (error) {
        next(error);
    }
}
module.exports = {
    getAllStations
};
