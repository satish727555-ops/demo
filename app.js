const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const express = require("express");

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
app.use(express.static(path.join(__dirname, "public")));

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
        message: "BCA Student System is running Ã°Å¸Å¡â‚¬"
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

// Vercel serverless handler
module.exports = async (req, res) => {
    try {
        await dbConnect();
        return app(req, res);
    } catch (error) {
        console.error("Database connection failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
};

// Local development server
if (!process.env.VERCEL) {
    const startServer = async () => {
        try {
            await dbConnect();
            app.listen(PORT, "0.0.0.0", () => {
                console.log(`Server running on port ${PORT}`);
            });
        } catch (error) {
            console.error("Server startup failed:", error.message);
            process.exit(1);
        }
    };

    startServer();
}


