USE train_reservation;

START TRANSACTION;

-- =========================================================
-- SAMPLE STATIONS
-- =========================================================

INSERT IGNORE INTO stations (
    station_code,
    station_name,
    city,
    state
)
VALUES
    ('HYB', 'Hyderabad Deccan', 'Hyderabad', 'Telangana'),
    ('KZJ', 'Kazipet Junction', 'Warangal', 'Telangana'),
    ('NGP', 'Nagpur Junction', 'Nagpur', 'Maharashtra'),
    ('BPL', 'Bhopal Junction', 'Bhopal', 'Madhya Pradesh'),
    ('NDLS', 'New Delhi', 'New Delhi', 'Delhi');


-- =========================================================
-- SAMPLE TRAIN
-- This is demonstration data for the project.
-- =========================================================

INSERT IGNORE INTO trains (
    train_number,
    train_name,
    is_active
)
VALUES (
    '90001',
    'Deccan Capital Express',
    TRUE
);

SET @train_id = (
    SELECT train_id
    FROM trains
    WHERE train_number = '90001'
);


-- =========================================================
-- ORDERED TRAIN STOPS
-- =========================================================

INSERT IGNORE INTO train_stops (
    train_id,
    station_id,
    stop_sequence,
    arrival_time,
    departure_time,
    day_offset,
    distance_from_origin_km
)
SELECT
    @train_id,
    station_id,
    1,
    NULL,
    '06:00:00',
    0,
    0
FROM stations
WHERE station_code = 'HYB';


INSERT IGNORE INTO train_stops (
    train_id,
    station_id,
    stop_sequence,
    arrival_time,
    departure_time,
    day_offset,
    distance_from_origin_km
)
SELECT
    @train_id,
    station_id,
    2,
    '08:15:00',
    '08:20:00',
    0,
    130
FROM stations
WHERE station_code = 'KZJ';


INSERT IGNORE INTO train_stops (
    train_id,
    station_id,
    stop_sequence,
    arrival_time,
    departure_time,
    day_offset,
    distance_from_origin_km
)
SELECT
    @train_id,
    station_id,
    3,
    '13:30:00',
    '13:40:00',
    0,
    580
FROM stations
WHERE station_code = 'NGP';


INSERT IGNORE INTO train_stops (
    train_id,
    station_id,
    stop_sequence,
    arrival_time,
    departure_time,
    day_offset,
    distance_from_origin_km
)
SELECT
    @train_id,
    station_id,
    4,
    '19:00:00',
    '19:10:00',
    0,
    970
FROM stations
WHERE station_code = 'BPL';


INSERT IGNORE INTO train_stops (
    train_id,
    station_id,
    stop_sequence,
    arrival_time,
    departure_time,
    day_offset,
    distance_from_origin_km
)
SELECT
    @train_id,
    station_id,
    5,
    '05:30:00',
    NULL,
    1,
    1670
FROM stations
WHERE station_code = 'NDLS';


-- =========================================================
-- GENERATE ADJACENT ROUTE SEGMENTS
-- =========================================================

INSERT IGNORE INTO route_segments (
    train_id,
    from_stop_id,
    to_stop_id,
    segment_sequence,
    distance_km
)
SELECT
    current_stop.train_id,
    current_stop.train_stop_id,
    next_stop.train_stop_id,
    current_stop.stop_sequence,
    next_stop.distance_from_origin_km
        - current_stop.distance_from_origin_km
FROM train_stops AS current_stop
JOIN train_stops AS next_stop
    ON next_stop.train_id = current_stop.train_id
   AND next_stop.stop_sequence =
       current_stop.stop_sequence + 1
WHERE current_stop.train_id = @train_id;


-- =========================================================
-- SAMPLE TRAIN RUN
-- Creates a journey scheduled seven days from today.
-- =========================================================

INSERT IGNORE INTO train_runs (
    train_id,
    journey_date,
    run_status
)
VALUES (
    @train_id,
    CURDATE() + INTERVAL 7 DAY,
    'SCHEDULED'
);

COMMIT;-- =========================================================
-- SAMPLE COACHES AND SEATS
-- =========================================================
START TRANSACTION;
SET @train_id = (
    SELECT train_id
    FROM trains
    WHERE train_number = '90001'
);
INSERT IGNORE INTO coaches (
    train_id,
    coach_number,
    coach_type
)
VALUES
    (@train_id, 'S1', 'SLEEPER'),
    (@train_id, 'B1', 'AC_3_TIER');
SET @sleeper_coach_id = (
    SELECT coach_id
    FROM coaches
    WHERE train_id = @train_id
      AND coach_number = 'S1'
);
SET @ac_coach_id = (
    SELECT coach_id
    FROM coaches
    WHERE train_id = @train_id
      AND coach_number = 'B1'
);
INSERT IGNORE INTO seats (
    coach_id,
    seat_number,
    berth_type
)
VALUES
    (@sleeper_coach_id, '1', 'LOWER'),
    (@sleeper_coach_id, '2', 'MIDDLE'),
    (@sleeper_coach_id, '3', 'UPPER'),
    (@sleeper_coach_id, '4', 'LOWER'),
    (@sleeper_coach_id, '5', 'MIDDLE'),
    (@sleeper_coach_id, '6', 'UPPER'),
    (@sleeper_coach_id, '7', 'SIDE_LOWER'),
    (@sleeper_coach_id, '8', 'SIDE_UPPER'),
    (@ac_coach_id, '1', 'LOWER'),
    (@ac_coach_id, '2', 'MIDDLE'),
    (@ac_coach_id, '3', 'UPPER'),
    (@ac_coach_id, '4', 'LOWER'),
    (@ac_coach_id, '5', 'MIDDLE'),
    (@ac_coach_id, '6', 'UPPER'),
    (@ac_coach_id, '7', 'SIDE_LOWER'),
    (@ac_coach_id, '8', 'SIDE_UPPER');
COMMIT;
