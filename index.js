const express = require("express");
require("dotenv").config();
const verifyToken = require("./secure/verifyToken");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const mimeTypes = require("mime-types");
const uuid = require("uuid");
const path = require("path");
const sharp = require("sharp");
const connectDB = require("./config/configDB");
const Document = require("./models/documentModel");

// Connect to MongoDB
connectDB();

const app = express();

// Middleware parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Token verification middleware (kecuali untuk route /api/preview)
const excludeTokenVerificationRoutes = ["/api/preview"];
app.use((req, res, next) => {
  const shouldExclude = excludeTokenVerificationRoutes.some((route) =>
    req.path.startsWith(route)
  );
  if (shouldExclude) {
    next();
  } else {
    verifyToken(req, res, next);
  }
});

// Konfigurasi storage Multer dengan logika penyimpanan berdasarkan created date
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = req.query.folder || "uploads";
    const currentYear = new Date().getFullYear();

    let createdDate = null;
    // Gunakan nilai dari req.query.created (atau fallback ke req.body.created) karena req.body
    // biasanya belum tersedia pada saat Multer memproses file
    const createdValue = req.query.created || req.body.created;
    if (createdValue) {
      let createdString = createdValue.trim();
      // Jika format YYYY-MM-DD, tambahkan waktu default agar menjadi ISO string
      if (createdString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        createdString += "T00:00:00Z";
      }
      if (!isNaN(Date.parse(createdString))) {
        createdDate = new Date(createdString);
        console.log("Parsed Created Date (ISO):", createdDate);
      } else if (!isNaN(createdString)) {
        createdDate = new Date(parseInt(createdString));
        console.log("Parsed Created Date (Timestamp):", createdDate);
      } else {
        console.warn("Invalid 'created' date format:", createdString);
      }
    }
    // Jika tidak valid, gunakan waktu saat ini
    if (!createdDate || isNaN(createdDate.getTime())) {
      createdDate = new Date();
    }

    console.log("Final Created Date:", createdDate);
    console.log("Extracted Year:", createdDate.getFullYear());
    console.log("Current Year:", currentYear);

    // Tentukan base path: jika tahun created berbeda dari tahun sekarang, gunakan STORAGE_PATH_ARCHIVE
    const basePath =
      createdDate.getFullYear() !== currentYear
        ? path.join(process.env.STORAGE_PATH_ARCHIVE)
        : process.env.STORAGE_PATH;

    const folderPath = path.join(basePath, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    const customFilename = req.query.filename;
    const fileExtension = file.originalname.split(".").pop();
    if (customFilename) {
      cb(null, `${customFilename}.${fileExtension}`);
    } else {
      const uniqueFilename = uuid.v4();
      cb(null, `${uniqueFilename}.${fileExtension}`);
    }
  },
});

// Konfigurasi Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Maksimal 100 MB
  fileFilter: function (req, file, cb) {
    const allowedMimeTypes = [
      "application/pdf",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ];
    const mimeType = mimeTypes.lookup(file.originalname);
    if (allowedMimeTypes.includes(mimeType)) {
      cb(null, true);
    } else {
      const error = new Error(
        "Invalid file type. Only PDF, CSV, Excel, and Word files are allowed."
      );
      error.httpStatusCode = 400;
      cb(error);
    }
  },
});

// Root endpoint untuk pengecekan server
app.get("/", (req, res) => {
  res.send("Cloud CDN filer server is up :)");
});

// =====================
// SINGLE FILE UPLOAD
// =====================
// =====================
// SINGLE FILE UPLOAD
// =====================
app.post(
  "/api/uploadfile",
  upload.fields([{ name: "myFile" }]),
  async (req, res, next) => {
    try {
      console.log("Final req.body:", req.body);

      // Ambil file dari field "myFile"
      const file = req.files["myFile"] ? req.files["myFile"][0] : null;
      let createdDate;

      // Gunakan nilai dari req.query.created jika tersedia, karena req.body.created biasanya kosong.
      const createdValue = req.query.created || req.body.created;
      if (createdValue) {
        let createdString = createdValue.trim();
        if (createdString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          createdString += "T00:00:00Z";
        }
        if (!isNaN(Date.parse(createdString))) {
          createdDate = new Date(createdString);
        } else if (!isNaN(createdString)) {
          createdDate = new Date(parseInt(createdString));
        } else {
          console.warn("Invalid 'created' date format:", createdString);
          createdDate = new Date();
        }
      } else {
        createdDate = new Date();
      }

      // Optional: Jika ada key khusus
      const key = req.body.key ? `${req.body.key}${Date.now()}` : null;

      if (!file) {
        const error = new Error("Please upload a file");
        error.httpStatusCode = 400;
        return next(error);
      }

      // Simpan informasi file ke database dengan createdDate yang telah konsisten
      const documentData = {
        app: req.body.app || "system",
        path: file.path,
        created: createdDate,
        delete: false,
      };
      if (key) {
        documentData.key = key;
      }
      const document = new Document(documentData);
      await document.save();

      res.send({
        message: "File uploaded successfully",
        filename: file.filename,
        document,
      });
    } catch (err) {
      next(err);
    }
  }
);


// =====================
// MULTIPLE FILE UPLOAD
// =====================
app.post(
  "/api/uploadmultiple",
  upload.array("myFiles", 12),
  (req, res, next) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        const error = new Error("Please choose files");
        error.httpStatusCode = 400;
        return next(error);
      }
      // Jika diperlukan, Anda dapat menambahkan penyimpanan informasi setiap file ke database
      res.send({
        message: "Files uploaded successfully",
        files: files.map((file) => ({
          filename: file.filename,
          path: file.path,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// =====================
// PREVIEW ENDPOINT
// =====================
app.get("/api/preview/*", async (req, res) => {
  try {
    // Dapatkan relative path dari URL (misalnya "tesdev/namafile.jpg")
    const relativePath = req.params[0];
    const key = req.query.key;
    console.log("DEBUG: Relative path:", relativePath);

    // Cari dokumen di database berdasarkan path dan status delete false
    const document = await Document.findOne({
      path: new RegExp(relativePath),
      delete: false,
    });
    console.log("DEBUG: Document found:", document);

    let basePath;
    if (document) {
      // Cek key jika diperlukan
      if (document.key && document.key !== key) {
        console.log("DEBUG: Invalid key. Document key:", document.key, "Query key:", key);
        return res.status(403).send("Invalid key");
      }
      // Konversi document.created ke Date dan peroleh tahun pembuatannya
      const createdDate = new Date(document.created);
      const createdYear = createdDate.getFullYear();
      const currentYear = new Date().getFullYear();
      console.log("DEBUG: Document created date:", createdDate, "Created year:", createdYear, "Current year:", currentYear);

      // Jika tahun pembuatan tidak sama dengan tahun saat ini, gunakan STORAGE_PATH_ARCHIVE,
      // jika sama, gunakan STORAGE_PATH.
      basePath = (createdYear !== currentYear)
        ? process.env.STORAGE_PATH_ARCHIVE
        : process.env.STORAGE_PATH;
      console.log("DEBUG: Computed basePath from DB:", basePath);
    } else {
      // Jika dokumen tidak ditemukan di DB, asumsikan file berada di STORAGE_PATH
      console.log("DEBUG: Document not found, using STORAGE_PATH");
      basePath = process.env.STORAGE_PATH;
    }

    // Gabungkan basePath dengan relativePath untuk mendapatkan filePath
    const filePath = path.join(basePath, relativePath);
    console.log("DEBUG: Computed filePath:", filePath);

    if (!fs.existsSync(filePath)) {
      console.log("DEBUG: File does not exist at computed filePath");
      return res.status(404).send("File not found on disk");
    }

    const mimeType = mimeTypes.lookup(filePath);
    console.log("DEBUG: Detected mime type:", mimeType);
    const isImage = ["image/png", "image/jpeg"].includes(mimeType);

    if (isImage) {
      const image = sharp(filePath);
      const width = parseInt(req.query.w, 10) || null;
      const height = parseInt(req.query.h, 10) || null;
      if (width || height) {
        const resizedImageBuffer = await image.resize(width, height).toBuffer();
        res.writeHead(200, {
          "Content-Type": mimeType,
          "Content-Length": resizedImageBuffer.length,
        });
        res.end(resizedImageBuffer);
      } else {
        const originalImageBuffer = await image.toBuffer();
        res.writeHead(200, {
          "Content-Type": mimeType,
          "Content-Length": originalImageBuffer.length,
        });
        res.end(originalImageBuffer);
      }
    } else {
      res.download(filePath);
    }
  } catch (error) {
    console.error("DEBUG: Error in preview endpoint:", error);
    res.status(500).send("Internal Server Error");
  }
});


// =====================
// ERROR HANDLING MIDDLEWARE
// =====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.httpStatusCode || 500).send({
    message: err.message || "Internal Server Error",
    error: err,
  });
});

// Start server
app.listen(process.env.PORT, () => {
  console.log("Server started on port " + process.env.PORT);
});
