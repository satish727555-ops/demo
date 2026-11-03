const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const express = require("express");
app.use(express.static("public"));
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const dbConnect = require("./models/dbConnect");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= VIEW ENGINE ================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ================= ROUTES ================= */

app.use("/api/users", require("./routes/userRoutes"));

/* ================= HOME ================= */

app.get("/", (req, res) => {
    res.redirect("/api/users/register");
});

/* ================= HEALTH CHECK ================= */

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "BCA Student System is running 🚀"
    });
});

/* ================= 404 ================= */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

/* ================= START SERVER ================= */

const startServer = async () => {
    try {
        await dbConnect();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();