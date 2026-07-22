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
            destination_station.station_code AS destination_code,
            destination_station.station_name AS destination_name,
            destination_stop.arrival_time,
            destination_stop.day_offset AS destination_day_offset,
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
module.exports = {
    findTrainsByRouteAndDate
};
