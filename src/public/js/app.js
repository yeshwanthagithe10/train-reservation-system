"use strict";
const searchForm =
    document.getElementById("train-search-form");
const trainResults =
    document.getElementById("train-results");
const searchMessage =
    document.getElementById("search-message");
const pnrForm =
    document.getElementById("pnr-form");
const pnrResult =
    document.getElementById("pnr-result");
const bookingForm =
    document.getElementById("booking-form");
const bookingMessage =
    document.getElementById("booking-message");
const bookingModalElement =
    document.getElementById("booking-modal");
const bookingModal =
    new bootstrap.Modal(bookingModalElement);
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value));
}
function showAlert(container, type, message) {
    container.innerHTML = `
        <div class="alert alert-${type}" role="alert">
            ${escapeHtml(message)}
        </div>
    `;
}
function showLoading(container, message) {
    container.innerHTML = `
        <div class="loading-spinner">
            <div
                class="spinner-border text-primary"
                role="status"
            ></div>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
}
function getDefaultJourneyDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
}
const journeyDateInput =
    document.getElementById("journey-date");
journeyDateInput.value = getDefaultJourneyDate();
journeyDateInput.min =
    new Date().toISOString().slice(0, 10);
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const source =
        document.getElementById("source")
            .value.trim().toUpperCase();
    const destination =
        document.getElementById("destination")
            .value.trim().toUpperCase();
    const date = journeyDateInput.value;
    searchMessage.innerHTML = "";
    showLoading(trainResults, "Searching available trains...");
    try {
        const query = new URLSearchParams({
            source,
            destination,
            date
        });
        const response = await fetch(
            `/api/trains/search?${query.toString()}`
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }
        renderTrainResults(
            data.trains,
            source,
            destination
        );
    } catch (error) {
        trainResults.innerHTML = "";
        showAlert(
            searchMessage,
            "danger",
            error.message || "Unable to search trains"
        );
    }
});
function renderTrainResults(
    trains,
    source,
    destination
) {
    if (trains.length === 0) {
        trainResults.innerHTML = `
            <div class="alert alert-info">
                No trains were found for this route and date.
            </div>
        `;
        return;
    }
    trainResults.innerHTML = `
        <div class="d-flex justify-content-between mb-3">
            <h3 class="h5 mb-0">
                ${trains.length} train(s) found
            </h3>
            <span class="text-muted">
                ${escapeHtml(source)}
                <i class="bi bi-arrow-right mx-1"></i>
                ${escapeHtml(destination)}
            </span>
        </div>
        ${trains.map((train) => `
            <article class="train-card">
                <div class="train-card-header">
                    <div>
                        <span class="train-number">
                            ${escapeHtml(train.train_number)}
                        </span>
                        <strong class="ms-2">
                            ${escapeHtml(train.train_name)}
                        </strong>
                    </div>
                    <span class="badge text-bg-success">
                        ${escapeHtml(train.run_status)}
                    </span>
                </div>
                <div class="train-card-body">
                    <div
                        class="journey-layout d-flex align-items-center"
                    >
                        <div class="journey-stop">
                            <strong>
                                ${escapeHtml(train.departure_time)}
                            </strong>
                            <span>
                                ${escapeHtml(train.source_code)}
                                — ${escapeHtml(train.source_name)}
                            </span>
                        </div>
                        <div class="journey-line"></div>
                        <div class="journey-stop text-md-end">
                            <strong>
                                ${escapeHtml(train.arrival_time)}
                            </strong>
                            <span>
                                ${escapeHtml(train.destination_code)}
                                — ${escapeHtml(train.destination_name)}
                            </span>
                        </div>
                    </div>
                    <div
                        class="d-flex flex-wrap justify-content-between align-items-center mt-4 gap-3"
                    >
                        <div>
                            <span class="me-3">
                                <i class="bi bi-calendar-event me-1"></i>
                                ${escapeHtml(train.journey_date)}
                            </span>
                            <span>
                                <i class="bi bi-signpost-2 me-1"></i>
                                ${escapeHtml(train.distance_km)} km
                            </span>
                        </div>
                        <div class="d-flex gap-2">
                            <button
                                class="btn btn-outline-primary availability-button"
                                data-run-id="${train.run_id}"
                                data-source="${escapeHtml(source)}"
                                data-destination="${escapeHtml(destination)}"
                                data-coach-type="SLEEPER"
                            >
                                Sleeper Availability
                            </button>
                            <button
                                class="btn btn-outline-dark availability-button"
                                data-run-id="${train.run_id}"
                                data-source="${escapeHtml(source)}"
                                data-destination="${escapeHtml(destination)}"
                                data-coach-type="AC_3_TIER"
                            >
                                AC 3 Tier
                            </button>
                        </div>
                    </div>
                    <div
                        id="availability-${train.run_id}"
                        class="availability-panel d-none"
                    ></div>
                </div>
            </article>
        `).join("")}
    `;
    document
        .querySelectorAll(".availability-button")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => loadAvailability(button)
            );
        });
}
async function loadAvailability(button) {
    const runId = button.dataset.runId;
    const source = button.dataset.source;
    const destination = button.dataset.destination;
    const coachType = button.dataset.coachType;
    const panel = document.getElementById(
        `availability-${runId}`
    );
    panel.classList.remove("d-none");
    showLoading(panel, "Checking seat availability...");
    try {
        const query = new URLSearchParams({
            source,
            destination,
            coachType
        });
        const response = await fetch(
            `/api/trains/${runId}/availability?${query}`
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }
        const seats = data.seats
            .map((seat) => `
                <span class="seat-badge">
                    ${escapeHtml(seat.coach_number)}
                    / ${escapeHtml(seat.seat_number)}
                    — ${escapeHtml(seat.berth_type)}
                </span>
            `)
            .join("");
        panel.innerHTML = `
            <div
                class="d-flex flex-wrap justify-content-between align-items-center gap-3"
            >
                <div>
                    <strong>
                        ${data.availableSeatCount}
                        seat(s) available
                    </strong>
                    <div class="text-muted small">
                        Coach class:
                        ${escapeHtml(data.coachType)}
                    </div>
                </div>
                <button
                    class="btn btn-success book-button"
                    data-run-id="${data.runId}"
                    data-source="${escapeHtml(data.source)}"
                    data-destination="${escapeHtml(data.destination)}"
                    data-coach-type="${escapeHtml(data.coachType)}"
                    ${data.availableSeatCount === 0
                        ? "disabled"
                        : ""}
                >
                    Book a Seat
                </button>
            </div>
            <div class="mt-3">
                ${seats || `
                    <span class="text-muted">
                        No seats are currently available.
                    </span>
                `}
            </div>
        `;
        const bookButton =
            panel.querySelector(".book-button");
        bookButton?.addEventListener(
            "click",
            () => openBookingModal(bookButton)
        );
    } catch (error) {
        showAlert(
            panel,
            "danger",
            error.message || "Unable to load availability"
        );
    }
}
function openBookingModal(button) {
    const runId = button.dataset.runId;
    const source = button.dataset.source;
    const destination = button.dataset.destination;
    const coachType = button.dataset.coachType;
    document.getElementById("booking-run-id").value =
        runId;
    document.getElementById("booking-source").value =
        source;
    document.getElementById(
        "booking-destination"
    ).value = destination;
    document.getElementById(
        "booking-coach-type"
    ).value = coachType;
    document.getElementById(
        "booking-summary"
    ).textContent =
        `${source} → ${destination} | ${coachType}`;
    bookingMessage.innerHTML = "";
    bookingForm.reset();
    document.getElementById(
        "booking-user-id"
    ).value = "1";
    bookingModal.show();
}
bookingForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();
        const body = {
            userId: Number(
                document.getElementById(
                    "booking-user-id"
                ).value
            ),
            runId: Number(
                document.getElementById(
                    "booking-run-id"
                ).value
            ),
            source:
                document.getElementById(
                    "booking-source"
                ).value,
            destination:
                document.getElementById(
                    "booking-destination"
                ).value,
            coachType:
                document.getElementById(
                    "booking-coach-type"
                ).value,
            passengers: [
                {
                    fullName:
                        document.getElementById(
                            "passenger-name"
                        ).value,
                    age: Number(
                        document.getElementById(
                            "passenger-age"
                        ).value
                    ),
                    gender:
                        document.getElementById(
                            "passenger-gender"
                        ).value
                }
            ]
        };
        showLoading(
            bookingMessage,
            "Confirming your booking..."
        );
        try {
            const response = await fetch(
                "/api/bookings",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(body)
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message);
            }
            bookingMessage.innerHTML = `
                <div class="alert alert-success">
                    <strong>
                        Booking confirmed!
                    </strong>
                    <div class="mt-2">
                        PNR:
                        <strong>
                            ${escapeHtml(data.booking.pnr)}
                        </strong>
                    </div>
                    <div>
                        Seat:
                        ${escapeHtml(
                            data.booking.passengers[0]
                                .coachNumber
                        )}
                        /
                        ${escapeHtml(
                            data.booking.passengers[0]
                                .seatNumber
                        )}
                    </div>
                    <div>
                        Total fare:
                        ${formatCurrency(
                            data.booking.totalFare
                        )}
                    </div>
                </div>
            `;
            document.getElementById(
                "pnr-number"
            ).value = data.booking.pnr;
        } catch (error) {
            showAlert(
                bookingMessage,
                "danger",
                error.message ||
                    "Unable to complete booking"
            );
        }
    }
);
pnrForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pnr =
        document.getElementById(
            "pnr-number"
        ).value.trim().toUpperCase();
    const userId =
        document.getElementById(
            "pnr-user-id"
        ).value;
    showLoading(pnrResult, "Loading booking details...");
    try {
        const response = await fetch(
            `/api/bookings/${encodeURIComponent(
                pnr
            )}?userId=${encodeURIComponent(userId)}`
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }
        renderPnrResult(data.booking, userId);
    } catch (error) {
        showAlert(
            pnrResult,
            "danger",
            error.message || "Unable to retrieve booking"
        );
    }
});
function renderPnrResult(booking, userId) {
    const statusClass =
        booking.bookingStatus === "CONFIRMED"
            ? "status-confirmed"
            : booking.bookingStatus === "CANCELLED"
                ? "status-cancelled"
                : "status-waiting";
    const passengers = booking.passengers
        .map((passenger) => `
            <tr>
                <td>${escapeHtml(passenger.fullName)}</td>
                <td>${escapeHtml(passenger.age)}</td>
                <td>
                    ${escapeHtml(
                        passenger.coachNumber || "-"
                    )}
                    /
                    ${escapeHtml(
                        passenger.seatNumber || "-"
                    )}
                </td>
                <td>
                    ${escapeHtml(
                        passenger.berthType || "-"
                    )}
                </td>
                <td>
                    ${escapeHtml(
                        passenger.passengerStatus
                    )}
                </td>
            </tr>
        `)
        .join("");
    const history = booking.statusHistory
        .map((item) => `
            <li class="mb-2">
                <strong>
                    ${escapeHtml(item.newStatus)}
                </strong>
                <div class="small text-muted">
                    ${escapeHtml(item.reason)}
                    — ${escapeHtml(item.changedAt)}
                </div>
            </li>
        `)
        .join("");
    pnrResult.innerHTML = `
        <div class="pnr-summary">
            <div
                class="d-flex justify-content-between align-items-start mb-3"
            >
                <div>
                    <small class="text-muted">
                        PNR
                    </small>
                    <h4>
                        ${escapeHtml(booking.pnr)}
                    </h4>
                </div>
                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHtml(booking.bookingStatus)}
                </span>
            </div>
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <strong>
                        ${escapeHtml(booking.trainNumber)}
                        — ${escapeHtml(booking.trainName)}
                    </strong>
                    <div class="text-muted">
                        ${escapeHtml(booking.journeyDate)}
                    </div>
                </div>
                <div class="col-md-6">
                    <strong>
                        ${escapeHtml(booking.source.code)}
                        →
                        ${escapeHtml(
                            booking.destination.code
                        )}
                    </strong>
                    <div class="text-muted">
                        Total:
                        ${formatCurrency(
                            booking.totalFare
                        )}
                    </div>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table align-middle">
                    <thead>
                        <tr>
                            <th>Passenger</th>
                            <th>Age</th>
                            <th>Seat</th>
                            <th>Berth</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${passengers}
                    </tbody>
                </table>
            </div>
            <div class="mt-4">
                <h6>Status history</h6>
                <ul>
                    ${history}
                </ul>
            </div>
            ${booking.bookingStatus === "CONFIRMED"
                ? `
                    <button
                        id="cancel-booking-button"
                        class="btn btn-outline-danger"
                    >
                        Cancel Booking
                    </button>
                `
                : ""}
        </div>
    `;
    const cancelButton =
        document.getElementById(
            "cancel-booking-button"
        );
    cancelButton?.addEventListener(
        "click",
        () => cancelBooking(
            booking.pnr,
            userId
        )
    );
}
async function cancelBooking(pnr, userId) {
    const reason = window.prompt(
        "Enter the cancellation reason:",
        "Travel plan changed"
    );
    if (reason === null) {
        return;
    }
    try {
        const response = await fetch(
            `/api/bookings/${encodeURIComponent(
                pnr
            )}/cancel`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    userId: Number(userId),
                    reason
                })
            }
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }
        showAlert(
            pnrResult,
            "success",
            "Booking cancelled successfully. The seat segments have been released."
        );
    } catch (error) {
        showAlert(
            pnrResult,
            "danger",
            error.message || "Unable to cancel booking"
        );
    }
}
