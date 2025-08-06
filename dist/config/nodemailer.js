"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
exports.transporter = nodemailer_1.default.createTransport({
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
