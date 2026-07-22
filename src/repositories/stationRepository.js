const pool = require("../config/db");
async function findAllStations() {
    const [rows] = await pool.execute(
        `
        SELECT
            station_id,
            station_code,
            station_name,
            city,
            state
        FROM stations
        ORDER BY station_name
        `
    );
    return rows;
}
module.exports = {
    findAllStations
};
