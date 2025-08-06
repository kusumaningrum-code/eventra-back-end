import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_SENDER,
    pass: process.env.MAIL_APP_PASSWORD,
  },
});
console.log("MAIL_SENDER:", process.env.MAIL_SENDER);
console.log("MAIL_APP_PASSWORD:", process.env.MAIL_APP_PASSWORD);
console.log("FE_URL:", process.env.FE_URL);
