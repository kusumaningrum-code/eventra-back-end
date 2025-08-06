import { transporter } from "../config/nodemailer";

export const sendEmail = async (
  email: string,
  subject: string,
  htmlContent: string
) => {
  try {
    console.log("Mengirim email ke:", email);
    await transporter.sendMail({
      from: process.env.MAIL_SENDER,
      to: email,
      subject,
      html: htmlContent,
    });
    console.log("Email berhasil dikirim");
  } catch (error) {
    console.log("Gagal kirim email:", error);
    throw error;
  }
};
