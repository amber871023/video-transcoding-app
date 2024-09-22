const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authorize } = require('../middlewares/auth');
const optionalAuthorize = require('../middlewares/optAuth');
const { uploadVideo, convertVideo, downloadVideo, deleteVideo, getUserVideos, reformatVideo } = require('../controllers/videoController');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB file size limit
  fileFilter: (req, file, cb) => {
    // Define the allowed file extensions
    const allowedExtensions = /mp4|mkv|avi|mov|wmv|flv|webm/;
    const allowedMIMETypes = [
      'video/mp4',
      'video/x-matroska', // mkv
      'video/x-msvideo', // avi
      'video/avi',
      'video/quicktime', // mov
      'video/x-ms-wmv', // wmv
      'video/x-flv', // flv
      'video/webm', // webm
      'application/octet-stream' // Fallback for cases like this
    ];

    // Extract the file extension and MIME type
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMIMETypes.includes(file.mimetype);

    // Check if the file extension and MIME type are allowed
    if (extname && mimetype) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid file type. Only MP4, MKV, AVI, MOV, and WMV files are allowed.'));
    }
  }
});


router.post('/upload', optionalAuthorize, upload.single('video'), uploadVideo);
router.post('/convert', optionalAuthorize, upload.none(), convertVideo);
router.post('/reformat/:id', optionalAuthorize, upload.none(), reformatVideo);
router.delete('/delete/:id', optionalAuthorize, deleteVideo);
router.get('/download/:id', optionalAuthorize, downloadVideo);
router.get('/', authorize, getUserVideos);


module.exports = router;
