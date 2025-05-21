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
const app = express();

app.use(express.json());
app.use(cors()); // Enable CORS

// Middleware to verify token for specific routes
const excludeTokenVerificationRoutes = ["/api/preview"];

app.use((req, res, next) => {
  const shouldExcludeTokenVerification = excludeTokenVerificationRoutes.some(
    (route) => req.path.startsWith(route)
  );

  if (shouldExcludeTokenVerification) {
    // Skip token verification for specific routes
    next();
  } else {
    verifyToken(req, res, next);
  }
});

// SET STORAGE
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = req.query.folder || "uploads";
    const folderPath = path.join(process.env.STORAGE_PATH, folderName);

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    const customFilename = req.query.filename; // Check if filename parameter exists
    const fileExtension = file.originalname.split(".").pop(); // Extract file extension

    if (customFilename) {
      // Use provided filename if exists
      cb(null, `${customFilename}.${fileExtension}`);
    } else {
      // Generate unique filename using UUID if no filename provided
      const uniqueFilename = uuid.v4();
      cb(null, `${uniqueFilename}.${fileExtension}`);
    }
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.ms-excel",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg"
    ];
    const allowedExtensions = [
      ".pdf",
      ".csv",
      ".xls",
      ".xlsx",
      ".docx",
      ".doc",
      ".png",
      ".jpg",
      ".jpeg",
      ".zip",
      ".rar"
    ];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    const mimeType = mimeTypes.lookup(file.originalname);
    if (allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      const error = new Error(
        "Invalid file type. Only PDF, CSV, ZIP, RAR, Excel, and Word files are allowed."
      );
      error.httpStatusCode = 400;
      cb(error);
    }
  },
});

app.get("/", (req, res) => {
  res.send("Cloud CDN filer server is up :)");
});

// Single file upload endpoint
app.post("/api/uploadfile", upload.single("myFile"), (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }
  res.send({
    message: "File uploaded successfully",
    filename: file.filename,
  });
});

// Multiple file upload endpoint
app.post(
  "/api/uploadmultiple",
  upload.array("myFiles", 12),
  (req, res, next) => {
    const files = req.files;
    if (!files) {
      const error = new Error("Please choose files");
      error.httpStatusCode = 400;
      return next(error);
    }
    res.send(files);
  }
);

app.get("/api/preview/*", async (req, res) => {
  const relativePath = req.params[0]; // Mendapatkan seluruh path setelah /api/preview/
  const filePath = path.join(process.env.STORAGE_PATH, relativePath);
  
  // Periksa apakah file ada
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  const mimeType = mimeTypes.lookup(filePath);
  const isImage = ["image/png", "image/jpeg"].includes(mimeType);

  console.log("MIME Type:", mimeType); // Log file type
  console.log("Width:", req.query.w, "Height:", req.query.h); // Log width and height parameters

  const width = parseInt(req.query.w, 10) || null;
  const height = parseInt(req.query.h, 10) || null;

  if (isImage) {
    try {
      const image = sharp(filePath);

      if (width || height) {
        const resizedImageBuffer = await image.resize(width, height).toBuffer();

        res.writeHead(200, {
          "Content-Type": mimeType,
          "Content-Length": resizedImageBuffer.length,
        });
        res.end(resizedImageBuffer);
      } else {
        // Kirim gambar asli jika tidak ada width atau height yang disediakan
        const originalImageBuffer = await image.toBuffer();
        res.writeHead(200, {
          "Content-Type": mimeType,
          "Content-Length": originalImageBuffer.length,
        });
        res.end(originalImageBuffer);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).send("Error processing image");
    }
  } else if (mimeType === "application/pdf") {
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Length": stat.size,
    });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } else if (
    [
      "text/csv", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/zip",
      "application/x-rar-compressed",
      "application/vnd.rar"
    ].includes(
      mimeType
    )
  ) {
    res.download(filePath, path.basename(filePath));
  } else {
    res.status(400).send("Invalid file type or resize not supported for this file type.");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.httpStatusCode || 500).send({
    message: err.message || "Internal Server Error",
    error: err,
  });
});

app.listen(process.env.PORT, () => {
  console.log("Server started on port " + process.env.PORT);
});
