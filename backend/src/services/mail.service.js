import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Configure the transporter using environment variables
const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: Number(env.smtpPort),
  secure: env.smtpSecure === "true", // true for 465, false for other ports
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
});

export async function sendMail({ to, subject, html }) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP configuration is missing");
  }
  return transporter.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to,
    subject,
    html
  });
}
