const stationRepository =
    require("../repositories/stationRepository");
async function getAllStations() {
    return stationRepository.findAllStations();
}
module.exports = {
    getAllStations
};
