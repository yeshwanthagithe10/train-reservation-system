require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.status(200).json({
        application: "Train Reservation System",
        message: "Server is running successfully"
    });
});
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy"
    });
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
