const crypto = require("crypto");
const bookingRepository =
    require("../repositories/bookingRepository");
const VALID_COACH_TYPES = new Set([
    "GENERAL",
    "SLEEPER",
    "AC_3_TIER",
    "AC_2_TIER",
    "AC_FIRST",
    "CHAIR_CAR"
]);
const VALID_GENDERS = new Set([
    "MALE",
    "FEMALE",
    "OTHER"
]);
const FARE_PER_KM = {
    GENERAL: 0.5,
    SLEEPER: 1.0,
    AC_3_TIER: 1.8,
    AC_2_TIER: 2.5,
    AC_FIRST: 4.0,
    CHAIR_CAR: 1.5
};
function createHttpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
function generatePnr() {
    const timePart = Date.now()
        .toString(36)
        .toUpperCase();
    const randomPart = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();
    return `TR${timePart}${randomPart}`.slice(0, 20);
}
function validateBookingInput(input) {
    const userId = Number(input.userId);
    const runId = Number(input.runId);
    const source =
        input.source?.trim().toUpperCase();
    const destination =
        input.destination?.trim().toUpperCase();
    const coachType =
        input.coachType?.trim().toUpperCase();
    if (!Number.isInteger(userId) || userId <= 0) {
        throw createHttpError(
            "User ID must be a positive integer",
            400
        );
    }
    if (!Number.isInteger(runId) || runId <= 0) {
        throw createHttpError(
            "Run ID must be a positive integer",
            400
        );
    }
    if (!source || !destination || !coachType) {
        throw createHttpError(
            "Source, destination and coach type are required",
            400
        );
    }
    if (source === destination) {
        throw createHttpError(
            "Source and destination must be different",
            400
        );
    }
    if (!VALID_COACH_TYPES.has(coachType)) {
        throw createHttpError(
            "Invalid coach type",
            400
        );
    }
    if (
        !Array.isArray(input.passengers) ||
        input.passengers.length === 0
    ) {
        throw createHttpError(
            "At least one passenger is required",
            400
        );
    }
    if (input.passengers.length > 6) {
        throw createHttpError(
            "A maximum of six passengers is allowed",
            400
        );
    }
    const passengers = input.passengers.map(
        (passenger, index) => {
            const fullName =
                passenger.fullName?.trim();
            const age = Number(passenger.age);
            const gender =
                passenger.gender?.trim().toUpperCase();
            if (!fullName) {
                throw createHttpError(
                    `Passenger ${index + 1} name is required`,
                    400
                );
            }
            if (
                !Number.isInteger(age) ||
                age < 1 ||
                age > 120
            ) {
                throw createHttpError(
                    `Passenger ${index + 1} age is invalid`,
                    400
                );
            }
            if (!VALID_GENDERS.has(gender)) {
                throw createHttpError(
                    `Passenger ${index + 1} gender is invalid`,
                    400
                );
            }
            return {
                fullName,
                age,
                gender
            };
        }
    );
    return {
        userId,
        runId,
        source,
        destination,
        coachType,
        passengers
    };
}
function calculateFare(distanceKm, coachType) {
    const rate = FARE_PER_KM[coachType];
    const calculatedFare =
        Number(distanceKm) * rate;
    return Math.max(
        50,
        Math.round(calculatedFare * 100) / 100
    );
}
async function createBooking(input) {
    const request = validateBookingInput(input);
    const connection =
        await bookingRepository.pool.getConnection();
    try {
        await connection.beginTransaction();
        const user = await bookingRepository.findUser(
            connection,
            request.userId
        );
        if (!user) {
            throw createHttpError(
                "User was not found",
                404
            );
        }
        const journey =
            await bookingRepository.findJourneyContext(
                connection,
                request.runId,
                request.source,
                request.destination
            );
        if (!journey) {
            throw createHttpError(
                "The requested train run or route was not found",
                404
            );
        }
        if (
            !["SCHEDULED", "DELAYED"].includes(
                journey.run_status
            )
        ) {
            throw createHttpError(
                "Booking is not open for this train run",
                409
            );
        }
        const farePerPassenger = calculateFare(
            journey.journey_distance_km,
            request.coachType
        );
        const pnr = generatePnr();
        const bookingId =
            await bookingRepository.createBooking(
                connection,
                {
                    pnr,
                    userId: request.userId,
                    runId: request.runId,
                    sourceStopId:
                        journey.source_stop_id,
                    destinationStopId:
                        journey.destination_stop_id
                }
            );
        const allocatedPassengers = [];
        for (const passenger of request.passengers) {
            const seat =
                await bookingRepository
                    .findAndLockAvailableSeat(
                        connection,
                        {
                            runId: request.runId,
                            trainId: journey.train_id,
                            coachType:
                                request.coachType,
                            sourceSequence:
                                journey.source_sequence,
                            destinationSequence:
                                journey.destination_sequence
                        }
                    );
            if (!seat) {
                throw createHttpError(
                    "Not enough seats are available for all passengers",
                    409
                );
            }
            const passengerId =
                await bookingRepository.createPassenger(
                    connection,
                    {
                        bookingId,
                        fullName: passenger.fullName,
                        age: passenger.age,
                        gender: passenger.gender,
                        seatId: seat.seat_id,
                        fare: farePerPassenger
                    }
                );
            const reservedSegmentCount =
                await bookingRepository
                    .reserveJourneySegments(
                        connection,
                        {
                            runId: request.runId,
                            trainId: journey.train_id,
                            seatId: seat.seat_id,
                            passengerId,
                            sourceSequence:
                                journey.source_sequence,
                            destinationSequence:
                                journey.destination_sequence
                        }
                    );
            const expectedSegmentCount =
                journey.destination_sequence -
                journey.source_sequence;
            if (
                reservedSegmentCount !==
                expectedSegmentCount
            ) {
                throw new Error(
                    "Failed to reserve every journey segment"
                );
            }
            allocatedPassengers.push({
                passengerId,
                fullName: passenger.fullName,
                age: passenger.age,
                gender: passenger.gender,
                fare: farePerPassenger,
                seatId: seat.seat_id,
                coachNumber: seat.coach_number,
                seatNumber: seat.seat_number,
                berthType: seat.berth_type
            });
        }
        const totalFare =
            Math.round(
                farePerPassenger *
                allocatedPassengers.length *
                100
            ) / 100;
        await bookingRepository.confirmBooking(
            connection,
            bookingId,
            totalFare
        );
        await bookingRepository
            .addBookingStatusHistory(
                connection,
                bookingId
            );
        await connection.commit();
        return {
            bookingId,
            pnr,
            bookingStatus: "CONFIRMED",
            trainNumber: journey.train_number,
            trainName: journey.train_name,
            journeyDate: journey.journey_date,
            source: request.source,
            destination: request.destination,
            coachType: request.coachType,
            totalFare,
            passengers: allocatedPassengers
        };
    } catch (error) {
        await connection.rollback();
        if (error.code === "ER_DUP_ENTRY") {
            throw createHttpError(
                "The selected seat was booked by another request",
                409
            );
        }
        throw error;
    } finally {
        connection.release();
    }
}
async function cancelBooking(pnrValue, input) {
    const pnr = pnrValue?.trim().toUpperCase();
    const userId = Number(input.userId);
    const reason =
        input.reason?.trim() ||
        "Cancelled by passenger";
    if (!pnr || pnr.length > 20) {
        throw createHttpError(
            "A valid PNR is required",
            400
        );
    }
    if (!Number.isInteger(userId) || userId <= 0) {
        throw createHttpError(
            "User ID must be a positive integer",
            400
        );
    }
    if (reason.length > 255) {
        throw createHttpError(
            "Cancellation reason cannot exceed 255 characters",
            400
        );
    }
    const connection =
        await bookingRepository.pool.getConnection();
    try {
        await connection.beginTransaction();
        const booking =
            await bookingRepository
                .findBookingByPnrForUpdate(
                    connection,
                    pnr
                );
        if (!booking) {
            throw createHttpError(
                "Booking was not found",
                404
            );
        }
        if (Number(booking.user_id) !== userId) {
            throw createHttpError(
                "You are not allowed to cancel this booking",
                403
            );
        }
        if (booking.booking_status === "CANCELLED") {
            throw createHttpError(
                "This booking is already cancelled",
                409
            );
        }
        if (booking.booking_status !== "CONFIRMED") {
            throw createHttpError(
                "Only confirmed bookings can be cancelled",
                409
            );
        }
        const cancelledSegmentCount =
            await bookingRepository
                .cancelSeatReservations(
                    connection,
                    booking.booking_id
                );
        const cancelledPassengerCount =
            await bookingRepository
                .cancelPassengers(
                    connection,
                    booking.booking_id
                );
        await bookingRepository.cancelBookingRecord(
            connection,
            booking.booking_id
        );
        await bookingRepository.addCancellationHistory(
            connection,
            booking.booking_id,
            booking.booking_status,
            reason
        );
        await connection.commit();
        return {
            bookingId: booking.booking_id,
            pnr: booking.pnr,
            bookingStatus: "CANCELLED",
            trainNumber: booking.train_number,
            trainName: booking.train_name,
            journeyDate: booking.journey_date,
            source: booking.source_code,
            destination: booking.destination_code,
            cancelledPassengerCount,
            releasedSegmentCount: cancelledSegmentCount,
            cancellationReason: reason
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
module.exports = {
    createBooking,
    cancelBooking
};

