const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const mimeTypes = require("mime-types");
const uuid = require("uuid");
const path = require("path");
const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS

// SET STORAGE
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = req.query.folder || "uploads";
    const folderPath = path.join(__dirname, "db", folderName);

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = uuid.v4();
    const fileExtension = file.originalname.split(".").pop();
    cb(null, `${uniqueFilename}.${fileExtension}`);
  },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: function (req, file, cb) {
        const allowedMimeTypes = [
            "application/pdf",
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

// Preview or download file endpoint
app.get("/api/preview/:folderName/:id", (req, res) => {
  const folderName = req.params.folderName;
  const filename = req.params.id;
  const filePath = path.join(__dirname, "db", folderName, filename);

  const stat = fs.statSync(filePath);

  const mimeType = mimeTypes.lookup(filePath);

  if (mimeType === "application/pdf") {
    // For PDF files, serve as a preview
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
    ].includes(mimeType)
  ) {
    // For CSV and Excel files, serve as a download
    res.download(filePath, filename);
  } else {
    // For other file types, you can customize the response accordingly
    res
      .status(400)
      .send("Invalid file type. Only PDF, CSV, and Excel files are allowed.");
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

app.listen(3121, () => {
  console.log("Server started on port 3121");
});
