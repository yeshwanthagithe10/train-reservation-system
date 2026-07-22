require("dotenv").config();
const path = require("path");
const express = require("express");
const pool = require("./src/config/db");
const pageRoutes = require("./src/routes/pageRoutes");
const trainRoutes = require("./src/routes/trainRoutes");
const bookingRoutes =
    require("./src/routes/bookingRoutes");
const app = express();
const PORT = process.env.PORT || 3000;
app.set("view engine", "ejs");
app.set(
    "views",
    path.join(__dirname, "src", "views")
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    express.static(
        path.join(__dirname, "src", "public")
    )
);
app.use("/", pageRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/bookings", bookingRoutes);
app.get("/health", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT
                DATABASE() AS database_name,
                CURRENT_USER() AS database_user
            `
        );
        res.status(200).json({
            status: "healthy",
            database: "connected",
            databaseName: rows[0].database_name,
            databaseUser: rows[0].database_user
        });
    } catch (error) {
        console.error(
            "Database health check failed:",
            error.message
        );
        res.status(503).json({
            status: "unhealthy",
            database: "disconnected"
        });
    }
});
app.use((req, res) => {
    if (req.originalUrl.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            message: "API route not found"
        });
    }
    return res.status(404).render("404", {
        title: "Page Not Found"
    });
});
app.use((error, req, res, next) => {
    console.error(error);
    if (req.originalUrl.startsWith("/api/")) {
        return res
            .status(error.statusCode || 500)
            .json({
                success: false,
                message:
                    error.statusCode
                        ? error.message
                        : "Internal server error"
            });
    }
    return res.status(error.statusCode || 500).send(
        "Something went wrong"
    );
});
app.listen(PORT, () => {
    console.log(
        `Server running at http://localhost:${PORT}`
    );
});
