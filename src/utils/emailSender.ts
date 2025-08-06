import { transporter } from "../config/nodemailer";

export const sendEmail = async (
  email: string,
  subject: string,
  htmlContent: string
) => {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_SENDER,
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
