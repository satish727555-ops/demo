const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const dbConnect = require("../models/dbConnect");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");
const sendOTP = require("../middleware/utils/sendEmail");




const USE_HASH = process.env.USE_HASH === "true";


/* =====================================================
   HELPERS
===================================================== */

const normalizeEmail = (email) => {
    return String(email || "").toLowerCase().trim();
};


const generateOTP = () => {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();
};


const otpExpiry = () => {
    return new Date(
        Date.now() + 5 * 60 * 1000
    );
};


const generateStudentId = () => {
    return `BCA-${Date.now()}`;
};


const errorResponse = (res, status, message) => {
    return res.status(status).json({
        success: false,
        message
    });
};


/* =====================================================
   REGISTER PAGE
===================================================== */

router.get("/register", (req, res) => {
    res.render("register");
});


/* =====================================================
   REGISTER STUDENT
===================================================== */

router.post("/register", async (req, res) => {

    try {

        await dbConnect();

        const {
            username,
            name,
            email,
            password,
            studentId,
            rollNo,
            phone,
            semester,
            course,
            college,
            university,
            dateOfBirth,
            address
        } = req.body;


        /* ================= NAME ================= */

        const studentName = String(
            username || name || ""
        ).trim();


        /* ================= EMAIL ================= */

        const normalizedEmail = normalizeEmail(email);


        /* ================= BASIC VALIDATION ================= */

        if (
            !studentName ||
            !normalizedEmail ||
            !password
        ) {
            return errorResponse(
                res,
                400,
                "Name, email and password are required."
            );
        }


        if (studentName.length < 3) {
            return errorResponse(
                res,
                400,
                "Name must contain at least 3 characters."
            );
        }


        if (password.length < 8) {
            return errorResponse(
                res,
                400,
                "Password must contain at least 8 characters."
            );
        }


        /* ================= STUDENT DETAILS ================= */

        if (
            !rollNo ||
            !phone ||
            !semester ||
            !college ||
            !university
        ) {
            return errorResponse(
                res,
                400,
                "Please provide all required BCA student details."
            );
        }


        const cleanRollNo = String(rollNo)
            .trim()
            .toUpperCase();


        const cleanPhone = String(phone).trim();


        const semesterNumber = Number(semester);


        /* ================= PHONE VALIDATION ================= */

        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            return errorResponse(
                res,
                400,
                "Please enter a valid 10-digit Indian mobile number."
            );
        }


        /* ================= SEMESTER VALIDATION ================= */

        if (
            Number.isNaN(semesterNumber) ||
            semesterNumber < 1 ||
            semesterNumber > 8
        ) {
            return errorResponse(
                res,
                400,
                "Semester must be between 1 and 8."
            );
        }


        /* =====================================================
           CHECK PERMANENT USER
        ===================================================== */

        const existingEmail = await User.findOne({
            email: normalizedEmail
        });

        if (existingEmail) {
            return errorResponse(
                res,
                409,
                "Email is already registered."
            );
        }


        const existingRollNo = await User.findOne({
            rollNo: cleanRollNo
        });

        if (existingRollNo) {
            return errorResponse(
                res,
                409,
                "Roll number is already registered."
            );
        }


        /* =====================================================
           CHECK PENDING USER
        ===================================================== */

        const existingPendingEmail =
            await PendingUser.findOne({
                email: normalizedEmail
            });


        if (existingPendingEmail) {

            await PendingUser.deleteOne({
                _id: existingPendingEmail._id
            });

        }


        /* ================= ROLL NUMBER CHECK ================= */

        const existingPendingRoll =
            await PendingUser.findOne({
                rollNo: cleanRollNo
            });


        if (existingPendingRoll) {

            return errorResponse(
                res,
                409,
                "Roll number is already waiting for OTP verification."
            );

        }


        /* =====================================================
           STUDENT ID
        ===================================================== */

        const finalStudentId =
            studentId
                ? String(studentId)
                    .trim()
                    .toUpperCase()
                : generateStudentId();


        const existingStudentId =
            await User.findOne({
                studentId: finalStudentId
            });


        if (existingStudentId) {
            return errorResponse(
                res,
                409,
                "Student ID is already registered."
            );
        }


        /* =====================================================
           PASSWORD
        ===================================================== */

        let savedPassword;

if (USE_HASH) {
    savedPassword = await bcrypt.hash(password, 12);
} else {
    savedPassword = password;
}


        /* =====================================================
           OTP
        ===================================================== */

        const otp = generateOTP();


        /* =====================================================
           CREATE PENDING USER
           
           IMPORTANT:
           User collection mein abhi data save nahi hoga.
        ===================================================== */

        const pendingUser =
            await PendingUser.create({

                studentId:
                    finalStudentId,

                name:
                    studentName,

                email:
                    normalizedEmail,

                password:
                    savedPassword,

                phone:
                    cleanPhone,

                rollNo:
                    cleanRollNo,

                semester:
                    semesterNumber,

                course:
                    course
                        ? String(course).trim()
                        : "BCA",

                college:
                    String(college).trim(),

                university:
                    String(university).trim(),

                dateOfBirth:
                    dateOfBirth
                        ? new Date(dateOfBirth)
                        : null,

                address:
                    address
                        ? String(address).trim()
                        : "",

                otp:
                    otp,

                otpExpires:
                    otpExpiry()

            });


        /* =====================================================
           SEND OTP
        ===================================================== */

        try {

            await sendOTP(
                normalizedEmail,
                otp
            );

        } catch (emailError) {

            console.error(
                "OTP Email Error:",
                emailError
            );


            /* ================= DELETE PENDING USER ================= */

            await PendingUser.deleteOne({
                _id: pendingUser._id
            });


            return errorResponse(
                res,
                500,
                "Unable to send OTP. Please try again."
            );

        }


        /* =====================================================
           SUCCESS
        ===================================================== */

        return res.status(201).json({

            success: true,

            message:
                "OTP sent successfully. Please verify your email.",

            studentId:
                pendingUser.studentId,

            email:
                pendingUser.email

        });


    } catch (error) {

        console.error(
            "Register Error:",
            error
        );


        return errorResponse(
            res,
            500,
            "Server error. Please try again later."
        );

    }

});


/* =====================================================
   VERIFY OTP
===================================================== */

router.post("/verify-otp", async (req, res) => {

    try {

        await dbConnect();

        const {
            email,
            otp
        } = req.body;


        if (!email || !otp) {

            return errorResponse(
                res,
                400,
                "Email and OTP are required."
            );

        }


        const normalizedEmail =
            normalizeEmail(email);


        /* =====================================================
           FIND PENDING USER
        ===================================================== */

        const pendingUser =
            await PendingUser.findOne({
                email: normalizedEmail
            });


        if (!pendingUser) {

            return errorResponse(
                res,
                404,
                "Registration not found or OTP has expired. Please register again."
            );

        }


        /* =====================================================
           CHECK OTP EXPIRY
        ===================================================== */

        if (
            !pendingUser.otpExpires ||
            pendingUser.otpExpires < new Date()
        ) {

            await PendingUser.deleteOne({
                _id: pendingUser._id
            });

            return errorResponse(
                res,
                400,
                "OTP has expired. Please register again."
            );

        }


        /* =====================================================
           CHECK OTP
        ===================================================== */

        if (
            String(pendingUser.otp) !==
            String(otp).trim()
        ) {

            return errorResponse(
                res,
                400,
                "Invalid OTP."
            );

        }


        /* =====================================================
           FINAL DUPLICATE CHECK
        ===================================================== */

        const existingUser =
            await User.findOne({
                $or: [
                    {
                        email:
                            pendingUser.email
                    },
                    {
                        rollNo:
                            pendingUser.rollNo
                    },
                    {
                        studentId:
                            pendingUser.studentId
                    }
                ]
            });


        if (existingUser) {

            await PendingUser.deleteOne({
                _id: pendingUser._id
            });

            return errorResponse(
                res,
                409,
                "Student is already registered."
            );

        }


        /* =====================================================
           MOVE PENDING USER -> USER
           
           YAHAN PERMANENT DATA SAVE HOGA
        ===================================================== */

        const user =
            await User.create({

                studentId:
                    pendingUser.studentId,

                name:
                    pendingUser.name,

                email:
                    pendingUser.email,

                password:
                    pendingUser.password,

                phone:
                    pendingUser.phone,

                rollNo:
                    pendingUser.rollNo,

                semester:
                    pendingUser.semester,

                course:
                    pendingUser.course,

                college:
                    pendingUser.college,

                university:
                    pendingUser.university,

                dateOfBirth:
                    pendingUser.dateOfBirth,

                address:
                    pendingUser.address,

                role:
                    "user",

                isVerified:
                    true,

                otp:
                    null,

                otpExpires:
                    null

            });


        /* =====================================================
           DELETE PENDING USER
        ===================================================== */

        await PendingUser.deleteOne({
            _id: pendingUser._id
        });


        /* =====================================================
           SUCCESS
        ===================================================== */

        return res.status(200).json({

            success:
                true,

            message:
                "Email verified successfully. Registration completed.",

            student: {

                studentId:
                    user.studentId,

                name:
                    user.name,

                email:
                    user.email,

                rollNo:
                    user.rollNo,

                semester:
                    user.semester,

                course:
                    user.course

            },

            redirect:
                "/api/users/login"

        });


    } catch (error) {

        console.error(
            "OTP Verification Error:",
            error
        );


        return errorResponse(
            res,
            500,
            "Unable to verify OTP. Please try again."
        );

    }

});


/* =====================================================
   RESEND OTP
===================================================== */

router.post("/resend-otp", async (req, res) => {

    try {

        await dbConnect();

        const {
            email
        } = req.body;


        if (!email) {

            return errorResponse(
                res,
                400,
                "Email is required."
            );

        }


        const normalizedEmail =
            normalizeEmail(email);


        const pendingUser =
            await PendingUser.findOne({
                email: normalizedEmail
            });


        if (!pendingUser) {

            return errorResponse(
                res,
                404,
                "Registration not found. Please register again."
            );

        }


        /* ================= NEW OTP ================= */

        const otp =
            generateOTP();


        pendingUser.otp =
            otp;

        pendingUser.otpExpires =
            otpExpiry();


        await pendingUser.save();


        /* ================= SEND ================= */

        try {

            await sendOTP(
                normalizedEmail,
                otp
            );

        } catch (emailError) {

            console.error(
                "Resend OTP Email Error:",
                emailError
            );

            return errorResponse(
                res,
                500,
                "Unable to resend OTP. Please try again."
            );

        }


        return res.status(200).json({

            success:
                true,

            message:
                "New OTP sent successfully."

        });


    } catch (error) {

        console.error(
            "Resend OTP Error:",
            error
        );


        return errorResponse(
            res,
            500,
            "Unable to resend OTP."
        );

    }

});


/* =====================================================
   LOGIN PAGE
===================================================== */

router.get("/login", (req, res) => {

    res.render("login");

});


/* =====================================================
   LOGIN
===================================================== */

router.post("/login", async (req, res) => {

    try {

        await dbConnect();

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return errorResponse(
                res,
                400,
                "Email and password are required."
            );

        }


        const user =
            await User.findOne({

                email:
                    normalizeEmail(email)

            });


        if (!user) {

            return errorResponse(
                res,
                401,
                "Invalid email or password."
            );

        }


        if (!user.isVerified) {

            return errorResponse(
                res,
                403,
                "Please verify your email first."
            );

        }


        /* =====================================================
           PASSWORD CHECK
        ===================================================== */

        let validPassword;


        if (USE_HASH) {

            validPassword =
                await bcrypt.compare(
                    password,
                    user.password
                );

        } else {

            validPassword =
                password ===
                user.password;

        }


        if (!validPassword) {

            return errorResponse(
                res,
                401,
                "Invalid email or password."
            );

        }


        /* =====================================================
           JWT
        ===================================================== */

        if (!process.env.JWT_SECRET) {

            console.error(
                "JWT_SECRET is missing."
            );

            return errorResponse(
                res,
                500,
                "JWT configuration is missing."
            );

        }


        const token =
            jwt.sign(

                {
                    id:
                        user._id,

                    role:
                        user.role

                },

                process.env.JWT_SECRET,

                {
                    expiresIn:
                        "1d"
                }

            );


        return res.status(200).json({

            success:
                true,

            message:
                "Login successful.",

            token,

            user: {

                id:
                    user._id,

                studentId:
                    user.studentId,

                name:
                    user.name,

                email:
                    user.email,

                phone:
                    user.phone,

                rollNo:
                    user.rollNo,

                semester:
                    user.semester,

                course:
                    user.course,

                college:
                    user.college,

                university:
                    user.university,

                role:
                    user.role

            }

        });


    } catch (error) {

        console.error(
            "Login Error:",
            error
        );


        return errorResponse(
            res,
            500,
            "Unable to login."
        );

    }

});


/* =====================================================
   PROFILE
===================================================== */

router.get(
    "/profile",
    protect,
    async (req, res) => {

        try {

            await dbConnect();


            const user =
                await User.findById(
                    req.user.id
                ).select(
                    "-password -otp -otpExpires"
                );


            if (!user) {

                return errorResponse(
                    res,
                    404,
                    "Student not found."
                );

            }


            return res.status(200).json({

                success:
                    true,

                user

            });


        } catch (error) {

            console.error(
                "Profile Error:",
                error
            );


            return errorResponse(
                res,
                500,
                "Unable to load student profile."
            );

        }

    }
);


/* =====================================================
   ALL STUDENTS
===================================================== */

router.get(
    "/students",
    protect,
    adminOnly,
    async (req, res) => {

        try {

            await dbConnect();


            const page =
                Math.max(
                    Number(req.query.page) || 1,
                    1
                );


            const limit =
                Math.min(
                    Math.max(
                        Number(req.query.limit) || 10,
                        1
                    ),
                    100
                );


            const skip =
                (page - 1) * limit;


            const totalStudents =
                await User.countDocuments({
                    role: "user"
                });


            const students =
                await User.find({
                    role: "user"
                })
                    .select(
                        "-password -otp -otpExpires"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .skip(skip)
                    .limit(limit);


            const totalPages =
                Math.ceil(
                    totalStudents / limit
                );


            return res.status(200).json({

                success:
                    true,

                pagination: {

                    currentPage:
                        page,

                    limit:
                        limit,

                    totalStudents:
                        totalStudents,

                    totalPages:
                        totalPages,

                    hasNextPage:
                        page < totalPages,

                    hasPreviousPage:
                        page > 1

                },

                students

            });


        } catch (error) {

            console.error(
                "Get Students Error:",
                error
            );


            return errorResponse(
                res,
                500,
                "Unable to load students."
            );

        }

    }
);


/* =====================================================
   STUDENT SEARCH
===================================================== */

router.get(
    "/students/search",
    protect,
    adminOnly,
    async (req, res) => {

        try {

            await dbConnect();


            const {
                studentId,
                rollNo,
                name,
                email,
                phone,
                semester
            } = req.query;


            const query = {};


            if (studentId) {

                query.studentId =
                    studentId
                        .trim()
                        .toUpperCase();

            }


            if (rollNo) {

                query.rollNo =
                    rollNo
                        .trim()
                        .toUpperCase();

            }


            if (name) {

                query.name = {

                    $regex:
                        name.trim(),

                    $options:
                        "i"

                };

            }


            if (email) {

                query.email =
                    email
                        .trim()
                        .toLowerCase();

            }


            if (phone) {

                query.phone =
                    phone.trim();

            }


            if (semester) {

                const semesterNumber =
                    Number(semester);


                if (
                    Number.isNaN(
                        semesterNumber
                    ) ||
                    semesterNumber < 1 ||
                    semesterNumber > 8
                ) {

                    return errorResponse(
                        res,
                        400,
                        "Semester must be between 1 and 8."
                    );

                }


                query.semester =
                    semesterNumber;

            }


            if (
                Object.keys(query).length === 0
            ) {

                return errorResponse(
                    res,
                    400,
                    "Please provide a search parameter."
                );

            }


            const students =
                await User.find(query)
                    .select(
                        "-password -otp -otpExpires"
                    )
                    .sort({
                        createdAt: -1
                    });


            return res.status(200).json({

                success:
                    true,

                count:
                    students.length,

                students

            });


        } catch (error) {

            console.error(
                "Student Search Error:",
                error
            );


            return errorResponse(
                res,
                500,
                "Unable to search students."
            );

        }

    }
);


/* =====================================================
   UPDATE STUDENT
===================================================== */

router.put(
    "/students/:id",
    protect,
    adminOnly,
    async (req, res) => {

        try {

            await dbConnect();


            const {
                name,
                phone,
                rollNo,
                semester,
                course,
                college,
                university,
                dateOfBirth,
                address
            } = req.body;


            const student =
                await User.findById(
                    req.params.id
                );


            if (!student) {

                return errorResponse(
                    res,
                    404,
                    "Student not found."
                );

            }


            if (name !== undefined) {

                const cleanName =
                    String(name).trim();


                if (
                    cleanName.length < 3
                ) {

                    return errorResponse(
                        res,
                        400,
                        "Name must contain at least 3 characters."
                    );

                }


                student.name =
                    cleanName;

            }


            if (phone !== undefined) {

                const cleanPhone =
                    String(phone).trim();


                if (
                    !/^[6-9]\d{9}$/.test(
                        cleanPhone
                    )
                ) {

                    return errorResponse(
                        res,
                        400,
                        "Please enter a valid 10-digit Indian mobile number."
                    );

                }


                student.phone =
                    cleanPhone;

            }


            if (rollNo !== undefined) {

                const cleanRollNo =
                    String(rollNo)
                        .trim()
                        .toUpperCase();


                const duplicateRoll =
                    await User.findOne({

                        rollNo:
                            cleanRollNo,

                        _id: {
                            $ne:
                                student._id
                        }

                    });


                if (duplicateRoll) {

                    return errorResponse(
                        res,
                        409,
                        "Roll number is already used by another student."
                    );

                }


                student.rollNo =
                    cleanRollNo;

            }


            if (semester !== undefined) {

                const semesterNumber =
                    Number(semester);


                if (
                    Number.isNaN(
                        semesterNumber
                    ) ||
                    semesterNumber < 1 ||
                    semesterNumber > 8
                ) {

                    return errorResponse(
                        res,
                        400,
                        "Semester must be between 1 and 8."
                    );

                }


                student.semester =
                    semesterNumber;

            }


            if (course !== undefined) {

                student.course =
                    String(course).trim();

            }


            if (college !== undefined) {

                student.college =
                    String(college).trim();

            }


            if (university !== undefined) {

                student.university =
                    String(university).trim();

            }


            if (dateOfBirth !== undefined) {

                student.dateOfBirth =
                    dateOfBirth
                        ? new Date(dateOfBirth)
                        : null;

            }


            if (address !== undefined) {

                student.address =
                    String(address).trim();

            }


            await student.save();


            const updatedStudent =
                await User.findById(
                    student._id
                ).select(
                    "-password -otp -otpExpires"
                );


            return res.status(200).json({

                success:
                    true,

                message:
                    "Student updated successfully.",

                student:
                    updatedStudent

            });


        } catch (error) {

            console.error(
                "Update Student Error:",
                error
            );


            return errorResponse(
                res,
                500,
                "Unable to update student."
            );

        }

    }
);


/* =====================================================
   DELETE STUDENT
===================================================== */

router.delete(
    "/students/:id",
    protect,
    adminOnly,
    async (req, res) => {

        try {

            await dbConnect();


            const student =
                await User.findById(
                    req.params.id
                );


            if (!student) {

                return errorResponse(
                    res,
                    404,
                    "Student not found."
                );

            }


            await User.deleteOne({
                _id:
                    req.params.id
            });


            return res.status(200).json({

                success:
                    true,

                message:
                    "Student deleted successfully."

            });


        } catch (error) {

            console.error(
                "Delete Student Error:",
                error
            );


            return errorResponse(
                res,
                500,
                "Unable to delete student."
            );

        }

    }
);


/* =====================================================
   ADMIN TEST
===================================================== */

router.get(
    "/admin",
    protect,
    adminOnly,
    (req, res) => {

        return res.status(200).json({

            success:
                true,

            message:
                "Welcome Admin."

        });

    }
);


/* =====================================================
   EXPORT
===================================================== */

module.exports = router;



