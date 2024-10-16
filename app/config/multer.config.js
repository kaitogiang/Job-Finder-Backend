//File cấu hình cho multer để thực hiện việc upload file
const multer = require("multer");
const path = require("path");

//Thiết lập storage engine
const storage = multer.diskStorage({
  destination: "./public/avatars",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `jobseeker-${uniqueSuffix + path.extname(file.originalname)}`);
  },
});

//Thiết lập upload
const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 2000000 }, //1MB limit
  fileFilter: (req, file, cb) => {
    checkImageFileType(file, cb);
  },
}).single("avatar");

//Hàm kiểm tra file ảnh hợp lệ
function checkImageFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(
    path.extname(file.originalname).toLocaleLowerCase()
  );
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

//Thiết lập một storage mới cho việc upload file pdf
const storagePdf = multer.diskStorage({
  destination: "./public/pdfs",
  filename: (req, file, cb) => {
    console.log("File pdf la: " + file.filename);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `jobseeker-${uniqueSuffix + path.extname(file.originalname)}`);
  },
});

const uploadedPdf = multer({
  storage: storagePdf,
  limits: { fileSize: 2000000 }, //2MB
  fileFilter: (req, file, cb) => {
    checkPdfFileType(file, cb);
  },
}).single("resume");

function checkPdfFileType(file, cb) {
  console.log(`checkFileType  ${path}`);
  const extname = path.extname(file.originalname).toLowerCase();
  if (extname === ".pdf") {
    return cb(null, true);
  }
  cb(new Error("Please upload a PDF file"));
}

//todo Tạo một xử lý cho nhiều file upload
const multiStorage = multer.diskStorage({
  destination: "./public/images",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `company-${uniqueSuffix + path.extname(file.originalname)}`);
  },
});

const uploadMultiImages = multer({
  storage: multiStorage,
  limits: { fileSize: 3000000 }, //3MB
  fileFilter: (req, file, cb) => {
    checkImageFileType(file, cb);
  },
}).array("images", 10);

//todo upload ảnh đại diện và ảnh công ty đồng thời
const combinedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "avatar") {
      console.log("Chạy lệnh trong combinedStorage:");
      cb(null, "./public/avatars");
    } else if (file.fieldname === "images") {
      cb(null, "./public/images");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix + path.extname(file.originalname)}`
    );
  },
});

const combinedImageUpload = multer({
  storage: combinedStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, //limit 5MB
  fileFilter: (req, file, cb) => {
    checkImageFileType(file, cb);
  },
});

module.exports = {
  uploadAvatar,
  uploadedPdf,
  uploadMultiImages,
  combinedImageUpload,
};
