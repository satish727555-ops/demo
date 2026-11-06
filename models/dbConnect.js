const mongoose = require("mongoose");

const dbConnect = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing");
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected:", conn.connection.name);
        return conn.connection;
    } catch (error) {
        console.error("MongoDB Connection Failed:", error.message);
        throw error;
    }
};

module.exports = dbConnect;
