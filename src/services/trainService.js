const trainRepository = require("../repositories/trainRepository");
const VALID_COACH_TYPES = new Set([
    "GENERAL",
    "SLEEPER",
    "AC_3_TIER",
    "AC_2_TIER",
    "AC_FIRST",
    "CHAIR_CAR"
]);
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
async function getSeatAvailability(
    runIdValue,
    source,
    destination,
    coachTypeValue
) {
    const runId = Number(runIdValue);
    const sourceCode = source?.trim().toUpperCase();
    const destinationCode = destination?.trim().toUpperCase();
    const coachType = coachTypeValue?.trim().toUpperCase();
    if (!Number.isInteger(runId) || runId <= 0) {
        const error = new Error(
            "Run ID must be a positive integer"
        );
        error.statusCode = 400;
        throw error;
    }
    if (!sourceCode || !destinationCode || !coachType) {
        const error = new Error(
            "Source, destination and coach type are required"
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
    if (!VALID_COACH_TYPES.has(coachType)) {
        const error = new Error("Invalid coach type");
        error.statusCode = 400;
        throw error;
    }
    const journey = await trainRepository.findJourneyContext(
        runId,
        sourceCode,
        destinationCode
    );
    if (!journey) {
        const error = new Error(
            "The requested train run or route was not found"
        );
        error.statusCode = 404;
        throw error;
    }
    if (!["SCHEDULED", "DELAYED"].includes(journey.run_status)) {
        const error = new Error(
            "Seat availability is not open for this train run"
        );
        error.statusCode = 409;
        throw error;
    }
    const seats = await trainRepository.findAvailableSeats(
        runId,
        journey.train_id,
        journey.source_sequence,
        journey.destination_sequence,
        coachType
    );
    return {
        runId,
        journeyDate: journey.journey_date,
        source: sourceCode,
        destination: destinationCode,
        coachType,
        availableSeatCount: seats.length,
        seats
    };
}
module.exports = {
    searchTrains,
    getSeatAvailability
};
