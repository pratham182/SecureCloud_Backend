import nodemailer from 'nodemailer';

import dotenv from 'dotenv';
dotenv.config();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, html) => {
    console.log(process.env.EMAIL_USER)
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log(error)
        throw new Error("Failed to send email");
    }
};

const sendResetEmail = async (email, resetUrl) => {
    const subject = "Password Reset Request";
    const html = `<p>Click <a href="${resetUrl}">here</a> to reset your password. The link is valid for one hour.</p>`;
    await sendEmail(email, subject, html);
}
export { sendEmail, sendResetEmail };
