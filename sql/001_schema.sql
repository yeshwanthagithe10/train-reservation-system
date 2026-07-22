USE train_reservation;

-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PASSENGER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role
        CHECK (role IN ('PASSENGER', 'ADMIN'))
) ENGINE = InnoDB;


-- =========================================================
-- 2. STATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS stations (
    station_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    station_code VARCHAR(10) NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_stations_code UNIQUE (station_code)
) ENGINE = InnoDB;


-- =========================================================
-- 3. TRAINS
-- =========================================================

CREATE TABLE IF NOT EXISTS trains (
    train_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    train_number VARCHAR(10) NOT NULL,
    train_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_trains_number UNIQUE (train_number)
) ENGINE = InnoDB;


-- =========================================================
-- 4. TRAIN STOPS
-- Defines the ordered route of each train.
-- =========================================================

CREATE TABLE IF NOT EXISTS train_stops (
    train_stop_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    train_id BIGINT UNSIGNED NOT NULL,
    station_id BIGINT UNSIGNED NOT NULL,
    stop_sequence SMALLINT UNSIGNED NOT NULL,
    arrival_time TIME NULL,
    departure_time TIME NULL,
    day_offset TINYINT UNSIGNED NOT NULL DEFAULT 0,
    distance_from_origin_km DECIMAL(8, 2) NOT NULL,

    CONSTRAINT uq_train_stop_sequence
        UNIQUE (train_id, stop_sequence),

    CONSTRAINT uq_train_station
        UNIQUE (train_id, station_id),

    CONSTRAINT chk_stop_sequence
        CHECK (stop_sequence > 0),

    CONSTRAINT chk_stop_distance
        CHECK (distance_from_origin_km >= 0),

    CONSTRAINT fk_train_stops_train
        FOREIGN KEY (train_id)
        REFERENCES trains(train_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_train_stops_station
        FOREIGN KEY (station_id)
        REFERENCES stations(station_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 5. ROUTE SEGMENTS
-- Each row represents travel between two adjacent stops.
-- =========================================================

CREATE TABLE IF NOT EXISTS route_segments (
    segment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    train_id BIGINT UNSIGNED NOT NULL,
    from_stop_id BIGINT UNSIGNED NOT NULL,
    to_stop_id BIGINT UNSIGNED NOT NULL,
    segment_sequence SMALLINT UNSIGNED NOT NULL,
    distance_km DECIMAL(8, 2) NOT NULL,

    CONSTRAINT uq_route_segment_sequence
        UNIQUE (train_id, segment_sequence),

    CONSTRAINT uq_route_segment_stops
        UNIQUE (train_id, from_stop_id, to_stop_id),

    CONSTRAINT chk_segment_sequence
        CHECK (segment_sequence > 0),

    CONSTRAINT chk_segment_distance
        CHECK (distance_km > 0),

    CONSTRAINT chk_different_segment_stops
        CHECK (from_stop_id <> to_stop_id),

    CONSTRAINT fk_route_segments_train
        FOREIGN KEY (train_id)
        REFERENCES trains(train_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_route_segments_from_stop
        FOREIGN KEY (from_stop_id)
        REFERENCES train_stops(train_stop_id),

    CONSTRAINT fk_route_segments_to_stop
        FOREIGN KEY (to_stop_id)
        REFERENCES train_stops(train_stop_id)
) ENGINE = InnoDB;


-- =========================================================
-- 6. COACHES
-- =========================================================

CREATE TABLE IF NOT EXISTS coaches (
    coach_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    train_id BIGINT UNSIGNED NOT NULL,
    coach_number VARCHAR(10) NOT NULL,
    coach_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_train_coach_number
        UNIQUE (train_id, coach_number),

    CONSTRAINT chk_coach_type
        CHECK (
            coach_type IN (
                'GENERAL',
                'SLEEPER',
                'AC_3_TIER',
                'AC_2_TIER',
                'AC_FIRST',
                'CHAIR_CAR'
            )
        ),

    CONSTRAINT fk_coaches_train
        FOREIGN KEY (train_id)
        REFERENCES trains(train_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 7. SEATS
-- =========================================================

CREATE TABLE IF NOT EXISTS seats (
    seat_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coach_id BIGINT UNSIGNED NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    berth_type VARCHAR(30) NOT NULL,

    CONSTRAINT uq_coach_seat_number
        UNIQUE (coach_id, seat_number),

    CONSTRAINT chk_berth_type
        CHECK (
            berth_type IN (
                'LOWER',
                'MIDDLE',
                'UPPER',
                'SIDE_LOWER',
                'SIDE_UPPER',
                'WINDOW',
                'MIDDLE_SEAT',
                'AISLE'
            )
        ),

    CONSTRAINT fk_seats_coach
        FOREIGN KEY (coach_id)
        REFERENCES coaches(coach_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 8. TRAIN RUNS
-- A train operating on one particular journey date.
-- =========================================================

CREATE TABLE IF NOT EXISTS train_runs (
    run_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    train_id BIGINT UNSIGNED NOT NULL,
    journey_date DATE NOT NULL,
    run_status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_train_journey_date
        UNIQUE (train_id, journey_date),

    CONSTRAINT chk_train_run_status
        CHECK (
            run_status IN (
                'SCHEDULED',
                'DELAYED',
                'CANCELLED',
                'COMPLETED'
            )
        ),

    CONSTRAINT fk_train_runs_train
        FOREIGN KEY (train_id)
        REFERENCES trains(train_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 9. BOOKINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS bookings (
    booking_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pnr VARCHAR(20) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    run_id BIGINT UNSIGNED NOT NULL,
    source_stop_id BIGINT UNSIGNED NOT NULL,
    destination_stop_id BIGINT UNSIGNED NOT NULL,
    booking_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_fare DECIMAL(10, 2) NOT NULL DEFAULT 0,
    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,

    CONSTRAINT uq_bookings_pnr UNIQUE (pnr),

    CONSTRAINT chk_booking_stops
        CHECK (source_stop_id <> destination_stop_id),

    CONSTRAINT chk_booking_total_fare
        CHECK (total_fare >= 0),

    CONSTRAINT chk_booking_status
        CHECK (
            booking_status IN (
                'PENDING',
                'CONFIRMED',
                'WAITING',
                'CANCELLED',
                'FAILED'
            )
        ),

    CONSTRAINT fk_bookings_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_bookings_run
        FOREIGN KEY (run_id)
        REFERENCES train_runs(run_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_bookings_source_stop
        FOREIGN KEY (source_stop_id)
        REFERENCES train_stops(train_stop_id),

    CONSTRAINT fk_bookings_destination_stop
        FOREIGN KEY (destination_stop_id)
        REFERENCES train_stops(train_stop_id)
) ENGINE = InnoDB;


-- =========================================================
-- 10. BOOKING PASSENGERS
-- One booking can contain multiple passengers.
-- =========================================================

CREATE TABLE IF NOT EXISTS booking_passengers (
    passenger_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    age TINYINT UNSIGNED NOT NULL,
    gender VARCHAR(20) NOT NULL,
    seat_id BIGINT UNSIGNED NULL,
    passenger_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    fare DECIMAL(10, 2) NOT NULL DEFAULT 0,

    CONSTRAINT chk_passenger_age
        CHECK (age BETWEEN 1 AND 120),

    CONSTRAINT chk_passenger_gender
        CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),

    CONSTRAINT chk_passenger_status
        CHECK (
            passenger_status IN (
                'PENDING',
                'CONFIRMED',
                'WAITING',
                'CANCELLED'
            )
        ),

    CONSTRAINT chk_passenger_fare
        CHECK (fare >= 0),

    CONSTRAINT fk_booking_passengers_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_booking_passengers_seat
        FOREIGN KEY (seat_id)
        REFERENCES seats(seat_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 11. SEAT-SEGMENT RESERVATIONS
--
-- The generated active columns make the unique constraint
-- apply only to CONFIRMED reservations.
--
-- This allows a cancelled segment to be booked again while
-- preserving the old reservation row for history.
-- =========================================================

CREATE TABLE IF NOT EXISTS seat_segment_reservations (
    reservation_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    run_id BIGINT UNSIGNED NOT NULL,
    seat_id BIGINT UNSIGNED NOT NULL,
    segment_id BIGINT UNSIGNED NOT NULL,
    passenger_id BIGINT UNSIGNED NOT NULL,
    reservation_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    reserved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,

    active_run_id BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN reservation_status = 'CONFIRMED' THEN run_id
                ELSE NULL
            END
        ) STORED,

    active_seat_id BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN reservation_status = 'CONFIRMED' THEN seat_id
                ELSE NULL
            END
        ) STORED,

    active_segment_id BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN reservation_status = 'CONFIRMED' THEN segment_id
                ELSE NULL
            END
        ) STORED,

    CONSTRAINT uq_active_seat_segment
        UNIQUE (
            active_run_id,
            active_seat_id,
            active_segment_id
        ),

    CONSTRAINT chk_reservation_status
        CHECK (
            reservation_status IN (
                'CONFIRMED',
                'CANCELLED'
            )
        ),

    CONSTRAINT fk_reservations_run
        FOREIGN KEY (run_id)
        REFERENCES train_runs(run_id),

    CONSTRAINT fk_reservations_seat
        FOREIGN KEY (seat_id)
        REFERENCES seats(seat_id),

    CONSTRAINT fk_reservations_segment
        FOREIGN KEY (segment_id)
        REFERENCES route_segments(segment_id),

    CONSTRAINT fk_reservations_passenger
        FOREIGN KEY (passenger_id)
        REFERENCES booking_passengers(passenger_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 12. PAYMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'INITIATED',
    transaction_reference VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,

    CONSTRAINT uq_payment_transaction
        UNIQUE (transaction_reference),

    CONSTRAINT chk_payment_amount
        CHECK (amount >= 0),

    CONSTRAINT chk_payment_status
        CHECK (
            payment_status IN (
                'INITIATED',
                'SUCCESS',
                'FAILED',
                'REFUNDED'
            )
        ),

    CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 13. BOOKING STATUS HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS booking_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    change_reason VARCHAR(255) NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_booking_history_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;