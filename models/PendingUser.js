const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema(
    {
        /* ================= STUDENT ID ================= */

        studentId: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },


        /* ================= NAME ================= */

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3
        },


        /* ================= EMAIL ================= */

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true
        },


        /* ================= PASSWORD ================= */

        password: {
            type: String,
            required: true
        },


        /* ================= PHONE ================= */

        phone: {
            type: String,
            required: true
        },


        /* ================= ROLL NUMBER ================= */

        rollNo: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },


        /* ================= SEMESTER ================= */

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8
        },


        /* ================= COURSE ================= */

        course: {
            type: String,
            default: "BCA",
            trim: true
        },


        /* ================= COLLEGE ================= */

        college: {
            type: String,
            required: true,
            trim: true
        },


        /* ================= UNIVERSITY ================= */

        university: {
            type: String,
            required: true,
            trim: true
        },


        /* ================= DATE OF BIRTH ================= */

        dateOfBirth: {
            type: Date,
            default: null
        },


        /* ================= ADDRESS ================= */

        address: {
            type: String,
            default: "",
            trim: true
        },


        /* ================= OTP ================= */

        otp: {
            type: String,
            required: true
        },


        /* ================= OTP EXPIRY ================= */

        otpExpires: {
            type: Date,
            required: true
        }
    },


    {
        timestamps: true
    }
);


/* =====================================================
   AUTO DELETE EXPIRED OTP RECORD
===================================================== */

pendingUserSchema.index(
    {
        otpExpires: 1
    },
    {
        expireAfterSeconds: 0
    }
);


module.exports = mongoose.model(
    "PendingUser",
    pendingUserSchema
);
