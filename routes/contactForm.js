const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// === Multer storage setup ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/contact_pdfs");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed."));
  },
});

// === POST /api/contact-form ===
router.post("/", upload.single("pdfFile"), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const file = req.file; // may be undefined if no file uploaded

    // ✅ Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email & message are required.",
      });
    }

    // === Email setup ===
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtpout.secureserver.net",
      port: process.env.MAIL_PORT || 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER, // e.g. info@kingdomhomes.in
        pass: process.env.MAIL_PASS, // app password or SMTP password
      },
      logger: true,
      debug: true,
    });

    // === Email body ===
    const mailOptions = {
      from: `"Contact Form " <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_RECEIVER ,
      subject: `New Contact Form Submission from ${name}`,
      text: `
Name: ${name}
Email: ${email}
Phone: ${phone || "N/A"}
Message:${message}
      `,
      attachments: file
        ? [
            {
              filename: file.originalname,
              path: file.path,
            },
          ]
        : [], // ✅ no attachment if no file uploaded
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "Form submitted successfully.",
      fileUploaded: !!file,
    });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error submitting form.",
    });
  }
});

module.exports = router;
