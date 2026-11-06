const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // ================= STUDENT INFORMATION =================

        studentId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            trim: true,
            match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"]
        },

        rollNo: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        semester: {
            type: Number,
            min: 1,
            max: 6
        },

        course: {
            type: String,
            default: "BCA",
            trim: true
        },

        college: {
            type: String,
            trim: true
        },

        university: {
            type: String,
            trim: true
        },

        dateOfBirth: {
            type: Date
        },

        address: {
            type: String,
            trim: true
        },

        // ================= AUTHENTICATION =================

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        // ================= OTP =================

        otp: {
            type: String,
            default: null
        },

        otpExpires: {
            type: Date,
            default: null
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);