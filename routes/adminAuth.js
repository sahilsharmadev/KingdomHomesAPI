// routes/adminAuth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const nodemailer = require("nodemailer");
require("dotenv").config();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/admin/login
router.post("/login", (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Invalid password" });
  }

  // Create JWT token valid for 1 hour
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

  res.json({ success: true, token });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "Token required" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
};

// Example protected route
router.get("/check", verifyToken, (req, res) => {
  res.json({ success: true, message: "Token valid", user: req.user });
});

// 💌 Forgot password endpoint
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log(req.body , ADMIN_EMAIL);
  

  // Check if email matches your admin email
  if (email !== ADMIN_EMAIL)
    return res.status(403).json({ success: false, message: "Unauthorized email" });

  // Setup mail transporter
  // const transporter = nodemailer.createTransport({
  //   service: "gmail",
  //   auth: {
  //     user: process.env.EMAIL_USER, // your Gmail
  //     pass: process.env.EMAIL_PASS, // app password
  //   },
  // });
  

const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // ensure this is correct SMTP password
  },
  tls: {
    rejectUnauthorized: false, // sometimes needed for testing
  },
   logger: true,
  debug: true,
});

const mailOptions = {
  from: `"KingDom Homes Admin Portal" <crm@kingdomhomes.in>`,
  to: email,
  subject: "Your KingDom Homes Admin Password",
  html: `
    <h2>KingDom Homes Admin Access</h2>
    <p>Your admin password is:</p>
    <h3 style="color:#D81F27;">${ADMIN_PASSWORD}</h3>
    <p>Keep it secure and do not share with anyone.</p>
    <br/>
    <small>If you didn’t request this email, please ignore it.</small>
  `,
};

try {
  await transporter.sendMail(mailOptions);
  res.json({ success: true, message: "Admin password sent to your email." });
} catch (error) {
  console.error("Mail send failed:", error);
  res.status(500).json({ success: false, message: "Failed to send email", error: error.message });
}

});

module.exports = router;
