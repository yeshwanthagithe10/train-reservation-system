USE train_reservation;

START TRANSACTION;

-- Use the same demo date as the original train.
SET @demo_date = (
    SELECT tr.journey_date
    FROM train_runs AS tr
    JOIN trains AS t
        ON t.train_id = tr.train_id
    WHERE t.train_number = '90001'
    ORDER BY tr.run_id
    LIMIT 1
);

-- =========================================================
-- ADDITIONAL STATIONS
-- =========================================================

INSERT IGNORE INTO stations (
    station_code,
    station_name,
    city,
    state
)
VALUES
    ('BZA', 'Vijayawada Junction', 'Vijayawada', 'Andhra Pradesh'),
    ('MAS', 'Chennai Central', 'Chennai', 'Tamil Nadu'),
    ('PUNE', 'Pune Junction', 'Pune', 'Maharashtra'),
    ('CSMT', 'Mumbai CSMT', 'Mumbai', 'Maharashtra'),
    ('SBC', 'KSR Bengaluru City Junction', 'Bengaluru', 'Karnataka');


-- =========================================================
-- SYNTHETIC TRAINS
-- These names and schedules are created for this project.
-- =========================================================

INSERT IGNORE INTO trains (
    train_number,
    train_name,
    is_active
)
VALUES
    ('90002', 'Northern Deccan Express', TRUE),
    ('90003', 'Coromandel City Link', TRUE),
    ('90004', 'Western Gateway Express', TRUE),
    ('90005', 'Tech Capital Express', TRUE),
    ('90006', 'Central India Connector', TRUE);


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
    train.train_id,
    station.station_id,
    route_data.stop_sequence,
    route_data.arrival_time,
    route_data.departure_time,
    route_data.day_offset,
    route_data.distance_km
FROM (
    -- 90002: Hyderabad to New Delhi
    SELECT
        '90002' AS train_number,
        'HYB' AS station_code,
        1 AS stop_sequence,
        NULL AS arrival_time,
        '17:00:00' AS departure_time,
        0 AS day_offset,
        0.00 AS distance_km

    UNION ALL SELECT
        '90002', 'KZJ', 2,
        '19:10:00', '19:15:00', 0, 130.00

    UNION ALL SELECT
        '90002', 'NGP', 3,
        '00:30:00', '00:40:00', 1, 580.00

    UNION ALL SELECT
        '90002', 'BPL', 4,
        '06:15:00', '06:25:00', 1, 970.00

    UNION ALL SELECT
        '90002', 'NDLS', 5,
        '16:00:00', NULL, 1, 1670.00


    -- 90003: Hyderabad to Chennai
    UNION ALL SELECT
        '90003', 'HYB', 1,
        NULL, '07:15:00', 0, 0.00

    UNION ALL SELECT
        '90003', 'BZA', 2,
        '12:30:00', '12:40:00', 0, 275.00

    UNION ALL SELECT
        '90003', 'MAS', 3,
        '19:45:00', NULL, 0, 680.00


    -- 90004: Hyderabad to Mumbai
    UNION ALL SELECT
        '90004', 'HYB', 1,
        NULL, '21:00:00', 0, 0.00

    UNION ALL SELECT
        '90004', 'PUNE', 2,
        '08:30:00', '08:40:00', 1, 560.00

    UNION ALL SELECT
        '90004', 'CSMT', 3,
        '12:30:00', NULL, 1, 750.00


    -- 90005: Bengaluru to New Delhi
    UNION ALL SELECT
        '90005', 'SBC', 1,
        NULL, '05:30:00', 0, 0.00

    UNION ALL SELECT
        '90005', 'HYB', 2,
        '14:00:00', '14:15:00', 0, 570.00

    UNION ALL SELECT
        '90005', 'NGP', 3,
        '21:30:00', '21:40:00', 0, 1150.00

    UNION ALL SELECT
        '90005', 'NDLS', 4,
        '13:00:00', NULL, 1, 2240.00


    -- 90006: Mumbai to New Delhi
    UNION ALL SELECT
        '90006', 'CSMT', 1,
        NULL, '06:45:00', 0, 0.00

    UNION ALL SELECT
        '90006', 'PUNE', 2,
        '10:30:00', '10:40:00', 0, 190.00

    UNION ALL SELECT
        '90006', 'BPL', 3,
        '20:00:00', '20:10:00', 0, 810.00

    UNION ALL SELECT
        '90006', 'NDLS', 4,
        '06:30:00', NULL, 1, 1510.00
) AS route_data

JOIN trains AS train
    ON train.train_number = route_data.train_number

JOIN stations AS station
    ON station.station_code = route_data.station_code;


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

JOIN trains AS train
    ON train.train_id = current_stop.train_id

WHERE train.train_number IN (
    '90002',
    '90003',
    '90004',
    '90005',
    '90006'
);


-- =========================================================
-- TRAIN RUNS
-- =========================================================

INSERT IGNORE INTO train_runs (
    train_id,
    journey_date,
    run_status
)
SELECT
    train_id,
    @demo_date,
    'SCHEDULED'
FROM trains
WHERE train_number IN (
    '90002',
    '90003',
    '90004',
    '90005',
    '90006'
);


-- =========================================================
-- COACHES
-- =========================================================

INSERT IGNORE INTO coaches (
    train_id,
    coach_number,
    coach_type
)
SELECT
    train_id,
    'S1',
    'SLEEPER'
FROM trains
WHERE train_number IN (
    '90002',
    '90003',
    '90004',
    '90005',
    '90006'
);

INSERT IGNORE INTO coaches (
    train_id,
    coach_number,
    coach_type
)
SELECT
    train_id,
    'B1',
    'AC_3_TIER'
FROM trains
WHERE train_number IN (
    '90002',
    '90003',
    '90004',
    '90005',
    '90006'
);


-- =========================================================
-- TEMPORARY SEAT TEMPLATE
-- =========================================================

DROP TEMPORARY TABLE IF EXISTS seed_seat_templates;

CREATE TEMPORARY TABLE seed_seat_templates (
    seat_number VARCHAR(10) PRIMARY KEY,
    berth_type VARCHAR(30) NOT NULL
);

INSERT INTO seed_seat_templates (
    seat_number,
    berth_type
)
VALUES
    ('1', 'LOWER'),
    ('2', 'MIDDLE'),
    ('3', 'UPPER'),
    ('4', 'LOWER'),
    ('5', 'MIDDLE'),
    ('6', 'UPPER'),
    ('7', 'SIDE_LOWER'),
    ('8', 'SIDE_UPPER');


-- =========================================================
-- GENERATE SEATS
-- =========================================================

INSERT IGNORE INTO seats (
    coach_id,
    seat_number,
    berth_type
)
SELECT
    coach.coach_id,
    template.seat_number,
    template.berth_type
FROM coaches AS coach

JOIN trains AS train
    ON train.train_id = coach.train_id

CROSS JOIN seed_seat_templates AS template

WHERE train.train_number IN (
    '90002',
    '90003',
    '90004',
    '90005',
    '90006'
);

DROP TEMPORARY TABLE seed_seat_templates;

COMMIT;