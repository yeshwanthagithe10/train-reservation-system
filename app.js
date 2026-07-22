require("dotenv").config();
const express = require("express");
const pool = require("./src/config/db");
const trainRoutes = require("./src/routes/trainRoutes");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.status(200).json({
        application: "Train Reservation System",
        database: "MySQL",
        message: "Server is running successfully"
    });
});
app.get("/health", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT DATABASE() AS database_name, CURRENT_USER() AS database_user"
        );
        res.status(200).json({
            status: "healthy",
            database: "connected",
            databaseName: rows[0].database_name,
            databaseUser: rows[0].database_user
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);
        res.status(503).json({
            status: "unhealthy",
            database: "disconnected"
        });
    }
});
app.use("/api/trains", trainRoutes);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});
app.use((error, req, res, next) => {
    console.error(error);
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal server error"
    });
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
