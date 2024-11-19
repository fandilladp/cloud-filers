# File Management Service

This service provides an API for handling file uploads, previews, and downloads. It supports secure file management with features like token verification, file resizing for images, and custom folder/file naming.

## Features

### 1. **Token Verification**
   - Secure endpoints by requiring a valid token, except for certain routes (e.g., `/api/preview`).
   - Routes excluded from token verification can be configured via the `excludeTokenVerificationRoutes` array.

### 2. **File Upload**
   - **Single File Upload**
     - Upload a single file to a specified folder.
     - Supports custom file naming through the `filename` query parameter.
   - **Multiple File Upload**
     - Upload up to 12 files at once to a specified folder.

### 3. **Custom Folder Creation**
   - Automatically creates folders based on the `folder` query parameter if they don't exist.

### 4. **File Type Validation**
   - Only allows uploads for the following file types:
     - PDF
     - CSV
     - Excel (.xlsx)
     - Word (.docx)
     - Images (PNG, JPEG)

### 5. **File Preview and Download**
   - **Preview Files:**
     - View resized images by specifying width (`w`) and height (`h`) as query parameters.
     - Supports direct previews for images (`image/png`, `image/jpeg`) and PDFs.
   - **Download Files:**
     - Directly download files such as CSV, Excel, or Word documents.

### 6. **Error Handling**
   - Comprehensive error handling for invalid file types, upload issues, or missing files.

---

## Getting Started

### Prerequisites
- Node.js installed
- A `.env` file with the following variables:
  ```env
  PORT=3000
  STORAGE_PATH=./storage
  ```

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo-name.git
   cd your-repo-name
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file and set the required variables:
   ```env
   PORT=3000
   STORAGE_PATH=./storage
   ```

4. Start the server:
   ```bash
   npm start
   ```

---

## API Endpoints

### **GET `/`**
- **Description:** Check the service status.
- **Response:** 
  ```json
  { "message": "Cloud CDN filer server is up :)" }
  ```

---

### **POST `/api/uploadfile`**
- **Description:** Upload a single file.
- **Query Parameters:**
  - `folder` (optional): Specify the folder where the file will be stored.
  - `filename` (optional): Provide a custom filename (without extension).
- **Form Data:**
  - `myFile` (required): The file to upload.
- **Response:**
  ```json
  {
    "message": "File uploaded successfully",
    "filename": "uploaded_filename.ext"
  }
  ```
- **Example Usage:**
  ```bash
  curl -X POST -F "myFile=@/path/to/file.png" "http://localhost:3000/api/uploadfile?folder=images&filename=myFileName"
  ```

---

### **POST `/api/uploadmultiple`**
- **Description:** Upload multiple files.
- **Query Parameters:**
  - `folder` (optional): Specify the folder where files will be stored.
- **Form Data:**
  - `myFiles` (required): Files to upload (up to 12 files).
- **Response:**
  ```json
  [
    {
      "fieldname": "myFiles",
      "originalname": "file1.png",
      "filename": "generated_or_custom_name.ext",
      ...
    },
    ...
  ]
  ```
- **Example Usage:**
  ```bash
  curl -X POST -F "myFiles=@/path/to/file1.png" -F "myFiles=@/path/to/file2.jpg" "http://localhost:3000/api/uploadmultiple?folder=documents"
  ```

---

### **GET `/api/preview/:folderName/:id`**
- **Description:** Preview or download a file.
- **Path Parameters:**
  - `folderName`: Name of the folder where the file is stored.
  - `id`: Filename (including extension).
- **Query Parameters (optional for images):**
  - `w`: Resize image width.
  - `h`: Resize image height.
- **Response:**
  - **Images:** Returns the resized or original image.
  - **PDF:** Returns the PDF content.
  - **Others:** Triggers a file download.
- **Example Usage:**
  ```bash
  # Preview an image with resizing
  curl "http://localhost:3000/api/preview/images/myImage.png?w=300&h=300"

  # Download a file
  curl -O "http://localhost:3000/api/preview/documents/myDocument.pdf"
  ```

---

### **Error Handling**
- **Invalid File Type:** 
  ```json
  {
    "message": "Invalid file type. Only PDF, CSV, Excel, and Word files are allowed."
  }
  ```
- **Missing File:**
  ```json
  {
    "message": "File not found"
  }
  ```

---

## Development Notes
1. **Custom Filename Behavior:**
   - If the `filename` query parameter is provided during upload, the file will be saved with that name.
   - If no `filename` is provided, the service will generate a unique filename using `uuid`.

2. **Image Resizing:**
   - Only applicable for `image/png` and `image/jpeg` files.
   - Resized dimensions are optional, and the original image is returned if no dimensions are provided.

3. **Middleware Overview:**
   - Token verification is applied to all routes except those listed in `excludeTokenVerificationRoutes`.

---

## Contributing
Feel free to fork this repository and submit pull requests for any improvements or features you'd like to add.

---

## License
This project is licensed under the MIT License.
```