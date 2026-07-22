const pool = require("../config/db");
async function findTrainsByRouteAndDate(
    sourceCode,
    destinationCode,
    journeyDate
) {
    const query = `
        SELECT
            tr.run_id,
            t.train_id,
            t.train_number,
            t.train_name,
            tr.journey_date,
            tr.run_status,
            source_station.station_code AS source_code,
            source_station.station_name AS source_name,
            source_stop.departure_time,
            source_stop.day_offset AS source_day_offset,
            DATE_ADD(
                tr.journey_date,
                INTERVAL source_stop.day_offset DAY
            ) AS departure_date,
            destination_station.station_code AS destination_code,
            destination_station.station_name AS destination_name,
            destination_stop.arrival_time,
            destination_stop.day_offset AS destination_day_offset,
            DATE_ADD(
                tr.journey_date,
                INTERVAL destination_stop.day_offset DAY
            ) AS arrival_date,
            TIMESTAMPDIFF(
                MINUTE,
                TIMESTAMP(
                    DATE_ADD(
                        tr.journey_date,
                        INTERVAL source_stop.day_offset DAY
                    ),
                    source_stop.departure_time
                ),
                TIMESTAMP(
                    DATE_ADD(
                        tr.journey_date,
                        INTERVAL destination_stop.day_offset DAY
                    ),
                    destination_stop.arrival_time
                )
            ) AS duration_minutes,
            destination_stop.distance_from_origin_km
                - source_stop.distance_from_origin_km AS distance_km
        FROM train_runs AS tr
        JOIN trains AS t
            ON t.train_id = tr.train_id
        JOIN train_stops AS source_stop
            ON source_stop.train_id = t.train_id
        JOIN stations AS source_station
            ON source_station.station_id = source_stop.station_id
        JOIN train_stops AS destination_stop
            ON destination_stop.train_id = t.train_id
        JOIN stations AS destination_station
            ON destination_station.station_id = destination_stop.station_id
        WHERE source_station.station_code = ?
          AND destination_station.station_code = ?
          AND tr.journey_date = ?
          AND source_stop.stop_sequence < destination_stop.stop_sequence
          AND t.is_active = TRUE
          AND tr.run_status IN ('SCHEDULED', 'DELAYED')
        ORDER BY source_stop.departure_time, t.train_number
    `;
    const [rows] = await pool.execute(query, [
        sourceCode,
        destinationCode,
        journeyDate
    ]);
    return rows;
}
async function findJourneyContext(
    runId,
    sourceCode,
    destinationCode
) {
    const query = `
        SELECT
            tr.run_id,
            tr.train_id,
            tr.journey_date,
            tr.run_status,
            source_stop.train_stop_id AS source_stop_id,
            source_stop.stop_sequence AS source_sequence,
            destination_stop.train_stop_id AS destination_stop_id,
            destination_stop.stop_sequence AS destination_sequence
        FROM train_runs AS tr
        JOIN train_stops AS source_stop
            ON source_stop.train_id = tr.train_id
        JOIN stations AS source_station
            ON source_station.station_id = source_stop.station_id
        JOIN train_stops AS destination_stop
            ON destination_stop.train_id = tr.train_id
        JOIN stations AS destination_station
            ON destination_station.station_id =
               destination_stop.station_id
        WHERE tr.run_id = ?
          AND source_station.station_code = ?
          AND destination_station.station_code = ?
          AND source_stop.stop_sequence <
              destination_stop.stop_sequence
        LIMIT 1
    `;
    const [rows] = await pool.execute(query, [
        runId,
        sourceCode,
        destinationCode
    ]);
    return rows[0] || null;
}
async function findAvailableSeats(
    runId,
    trainId,
    sourceSequence,
    destinationSequence,
    coachType
) {
    const query = `
        SELECT
            s.seat_id,
            c.coach_id,
            c.coach_number,
            c.coach_type,
            s.seat_number,
            s.berth_type
        FROM coaches AS c
        JOIN seats AS s
            ON s.coach_id = c.coach_id
        WHERE c.train_id = ?
          AND c.coach_type = ?
          AND NOT EXISTS (
              SELECT 1
              FROM seat_segment_reservations AS reservation
              JOIN route_segments AS segment
                  ON segment.segment_id = reservation.segment_id
              WHERE reservation.run_id = ?
                AND reservation.seat_id = s.seat_id
                AND reservation.reservation_status = 'CONFIRMED'
                AND segment.train_id = ?
                AND segment.segment_sequence >= ?
                AND segment.segment_sequence < ?
          )
        ORDER BY
            c.coach_number,
            CAST(s.seat_number AS UNSIGNED),
            s.seat_number
    `;
    const [rows] = await pool.execute(query, [
        trainId,
        coachType,
        runId,
        trainId,
        sourceSequence,
        destinationSequence
    ]);
    return rows;
}
module.exports = {
    findTrainsByRouteAndDate,
    findJourneyContext,
    findAvailableSeats
};

