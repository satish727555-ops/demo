const nodemailer = require("nodemailer");

const sendOTP = async (email, otp) => {

    console.log("=================================");
    console.log("📧 Sending OTP...");
    console.log("📧 To:", email);
    console.log("📧 From:", process.env.EMAIL_USER);
    console.log("📧 Password:", process.env.EMAIL_PASS ? "SET" : "NOT SET");
    console.log("=================================");

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,

        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },

        tls: {
            rejectUnauthorized: false
        }
    });

    try {

        await transporter.verify();

        console.log("✅ SMTP connection successful");

        const info = await transporter.sendMail({

            from: `"BCA Student Portal" <${process.env.EMAIL_USER}>`,

            to: email,

            subject: "BCA Student Portal - Email Verification OTP",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 500px;
                    margin: auto;
                    padding: 25px;
                    border: 1px solid #ddd;
                    border-radius: 12px;
                ">

                    <h2 style="color:#2563eb;">
                        BCA Student Portal
                    </h2>

                    <p>
                        Your email verification OTP is:
                    </p>

                    <h1 style="
                        letter-spacing: 8px;
                        color: #111827;
                    ">
                        ${otp}
                    </h1>

                    <p>
                        This OTP will expire in 5 minutes.
                    </p>

                    <p>
                        If you did not request this registration,
                        please ignore this email.
                    </p>

                </div>
            `
        });

        console.log("✅ OTP EMAIL SENT");
        console.log("📨 Message ID:", info.messageId);

        return info;

    } catch (error) {

        console.error("❌ SMTP/SEND ERROR");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Response:", error.response);
        console.error("Command:", error.command);

        throw error;
    }
};

module.exports = sendOTP;
