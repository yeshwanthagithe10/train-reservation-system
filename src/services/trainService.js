const trainRepository = require("../repositories/trainRepository");
function isValidDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }
    const parsedDate = new Date(`${date}T00:00:00Z`);
    return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date
    );
}
async function searchTrains(source, destination, date) {
    const sourceCode = source?.trim().toUpperCase();
    const destinationCode = destination?.trim().toUpperCase();
    if (!sourceCode || !destinationCode || !date) {
        const error = new Error(
            "Source, destination and journey date are required"
        );
        error.statusCode = 400;
        throw error;
    }
    if (sourceCode === destinationCode) {
        const error = new Error(
            "Source and destination stations must be different"
        );
        error.statusCode = 400;
        throw error;
    }
    if (!isValidDate(date)) {
        const error = new Error(
            "Journey date must use the YYYY-MM-DD format"
        );
        error.statusCode = 400;
        throw error;
    }
    return trainRepository.findTrainsByRouteAndDate(
        sourceCode,
        destinationCode,
        date
    );
}
module.exports = {
    searchTrains
};
