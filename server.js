const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const compression = require("compression");
const sharp = require("sharp");
const adminAuth = require("./routes/adminAuth");
const contactForm = require("./routes/contactForm");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5002;

// ✅ Enable CORS and JSON
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(compression()); // ✅ Gzip compression for faster response
app.use("/api/contact-form", contactForm);

// ✅ Serve static files from /uploads with caching
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d", // Cache for 7 days
    etag: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=604800");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// ✅ Admin routes
app.use("/api/admin", adminAuth);

// ✅ Gallery JSON data store
const GALLERY_FILE = path.join(__dirname, "galleryData.json");
if (!fs.existsSync(GALLERY_FILE)) fs.writeFileSync(GALLERY_FILE, "[]", "utf8");

const readGallery = () =>
  JSON.parse(fs.readFileSync(GALLERY_FILE, "utf8") || "[]");
const saveGallery = (data) =>
  fs.writeFileSync(GALLERY_FILE, JSON.stringify(data, null, 2));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("📁 uploads folder created");
}


// ✅ Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// ✅ Get all images
app.get("/api/gallery", (req, res) => {
  res.json(readGallery());
});

// ✅ Upload & compress image
app.post("/api/gallery/upload", upload.single("image"), async (req, res) => {
  try {
    const { index, mode } = req.body;
    const idx = Number(index);
    const galleryData = readGallery();

    // ✅ Compress image using sharp
    const optimizedFilename = `compressed-${Date.now()}-${req.file.originalname.replace(
      /\s+/g,
      "_"
    )}`;
    const optimizedPath = path.join("uploads", optimizedFilename);

    await sharp(req.file.path)
      .resize({ width: 1000 }) // Resize width to 1000px
      .jpeg({ quality: 75 }) // Compress quality to 75%
      .toFile(optimizedPath);

   setTimeout(() => {
  fs.unlink(req.file.path, (err) => {
    if (err) console.log("⚠ File delete warning:", err.message);
  });
}, 50);

    const newImage = {
      id: Date.now(),
      url: `http://localhost:${PORT}/uploads/${optimizedFilename}`,
    };

    if (mode === "replace" && idx >= 0 && idx < galleryData.length) {
      galleryData[idx] = newImage;
    } else if (mode === "insert" && idx >= 0 && idx <= galleryData.length) {
      galleryData.splice(idx, 0, newImage);
    } else {
      galleryData.push(newImage);
    }

    saveGallery(galleryData);
    res.json({ success: true, galleryData });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

// ✅ Delete image
app.delete("/api/gallery/:id", (req, res) => {
  const id = Number(req.params.id);
  let galleryData = readGallery();
  const imgToDelete = galleryData.find((i) => i.id === id);

  if (imgToDelete) {
    const filePath = path.join(
      __dirname,
      imgToDelete.url.replace(`http://localhost:${PORT}/`, "")
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  galleryData = galleryData.filter((img) => img.id !== id);
  saveGallery(galleryData);
  res.json({ success: true });
});

// ✅ Start server
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
