const pool = require("../config/db");
async function findUser(connection, userId) {
    const [rows] = await connection.execute(
        `
        SELECT
            user_id,
            full_name,
            email,
            role
        FROM users
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
    );
    return rows[0] || null;
}
async function findJourneyContext(
    connection,
    runId,
    sourceCode,
    destinationCode
) {
    const [rows] = await connection.execute(
        `
        SELECT
            tr.run_id,
            tr.train_id,
            tr.journey_date,
            tr.run_status,
            t.train_number,
            t.train_name,
            source_stop.train_stop_id AS source_stop_id,
            source_stop.stop_sequence AS source_sequence,
            source_stop.distance_from_origin_km
                AS source_distance_km,
            destination_stop.train_stop_id
                AS destination_stop_id,
            destination_stop.stop_sequence
                AS destination_sequence,
            destination_stop.distance_from_origin_km
                AS destination_distance_km,
            destination_stop.distance_from_origin_km
                - source_stop.distance_from_origin_km
                AS journey_distance_km
        FROM train_runs AS tr
        JOIN trains AS t
            ON t.train_id = tr.train_id
        JOIN train_stops AS source_stop
            ON source_stop.train_id = tr.train_id
        JOIN stations AS source_station
            ON source_station.station_id =
               source_stop.station_id
        JOIN train_stops AS destination_stop
            ON destination_stop.train_id = tr.train_id
        JOIN stations AS destination_station
            ON destination_station.station_id =
               destination_stop.station_id
        WHERE tr.run_id = ?
          AND source_station.station_code = ?
          AND destination_station.station_code = ?
          AND source_stop.stop_sequence
              < destination_stop.stop_sequence
        LIMIT 1
        `,
        [runId, sourceCode, destinationCode]
    );
    return rows[0] || null;
}
async function createBooking(
    connection,
    {
        pnr,
        userId,
        runId,
        sourceStopId,
        destinationStopId
    }
) {
    const [result] = await connection.execute(
        `
        INSERT INTO bookings (
            pnr,
            user_id,
            run_id,
            source_stop_id,
            destination_stop_id,
            booking_status,
            total_fare
        )
        VALUES (?, ?, ?, ?, ?, 'PENDING', 0)
        `,
        [
            pnr,
            userId,
            runId,
            sourceStopId,
            destinationStopId
        ]
    );
    return result.insertId;
}
async function findAndLockAvailableSeat(
    connection,
    {
        runId,
        trainId,
        coachType,
        sourceSequence,
        destinationSequence
    }
) {
    const [rows] = await connection.execute(
        `
        SELECT
            s.seat_id,
            s.seat_number,
            s.berth_type,
            c.coach_id,
            c.coach_number,
            c.coach_type
        FROM seats AS s
        JOIN coaches AS c
            ON c.coach_id = s.coach_id
        WHERE c.train_id = ?
          AND c.coach_type = ?
          AND NOT EXISTS (
              SELECT 1
              FROM seat_segment_reservations
                  AS reservation
              JOIN route_segments AS segment
                  ON segment.segment_id =
                     reservation.segment_id
              WHERE reservation.run_id = ?
                AND reservation.seat_id = s.seat_id
                AND reservation.reservation_status =
                    'CONFIRMED'
                AND segment.train_id = ?
                AND segment.segment_sequence >= ?
                AND segment.segment_sequence < ?
          )
        ORDER BY
            c.coach_number,
            CAST(s.seat_number AS UNSIGNED),
            s.seat_number
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        `,
        [
            trainId,
            coachType,
            runId,
            trainId,
            sourceSequence,
            destinationSequence
        ]
    );
    return rows[0] || null;
}
async function createPassenger(
    connection,
    {
        bookingId,
        fullName,
        age,
        gender,
        seatId,
        fare
    }
) {
    const [result] = await connection.execute(
        `
        INSERT INTO booking_passengers (
            booking_id,
            full_name,
            age,
            gender,
            seat_id,
            passenger_status,
            fare
        )
        VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?)
        `,
        [
            bookingId,
            fullName,
            age,
            gender,
            seatId,
            fare
        ]
    );
    return result.insertId;
}
async function reserveJourneySegments(
    connection,
    {
        runId,
        trainId,
        seatId,
        passengerId,
        sourceSequence,
        destinationSequence
    }
) {
    const [result] = await connection.execute(
        `
        INSERT INTO seat_segment_reservations (
            run_id,
            seat_id,
            segment_id,
            passenger_id,
            reservation_status
        )
        SELECT
            ?,
            ?,
            segment_id,
            ?,
            'CONFIRMED'
        FROM route_segments
        WHERE train_id = ?
          AND segment_sequence >= ?
          AND segment_sequence < ?
        ORDER BY segment_sequence
        `,
        [
            runId,
            seatId,
            passengerId,
            trainId,
            sourceSequence,
            destinationSequence
        ]
    );
    return result.affectedRows;
}
async function confirmBooking(
    connection,
    bookingId,
    totalFare
) {
    await connection.execute(
        `
        UPDATE bookings
        SET
            booking_status = 'CONFIRMED',
            total_fare = ?
        WHERE booking_id = ?
        `,
        [totalFare, bookingId]
    );
}
async function addBookingStatusHistory(
    connection,
    bookingId
) {
    await connection.execute(
        `
        INSERT INTO booking_status_history (
            booking_id,
            old_status,
            new_status,
            change_reason
        )
        VALUES (
            ?,
            'PENDING',
            'CONFIRMED',
            'Seats allocated successfully'
        )
        `,
        [bookingId]
    );
}
module.exports = {
    pool,
    findUser,
    findJourneyContext,
    createBooking,
    findAndLockAvailableSeat,
    createPassenger,
    reserveJourneySegments,
    confirmBooking,
    addBookingStatusHistory
};
