import express from 'express';
import multer from 'multer';
import path from 'path';

// Middleware imports
import { authorize } from '../middlewares/auth.js';
import { optAuth as optionalAuthorize } from '../middlewares/optAuth.js';
import { uploadVideo, convertVideo, downloadVideo, deleteVideo, getUserVideos, reformatVideo } from '../controllers/videoController.js';

// Setting up router and other utilities
const router = express.Router();

// Storage setup for multer
const storage = multer.memoryStorage();

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB file size limit
  fileFilter: (req, file, cb) => {
    // Define the allowed file extensions
    const allowedExtensions = /mp4|mpeg|avi|mov|wmv|flv|webm|mpeg/;
    const allowedMIMETypes = [
      'video/mp4',
      'video/x-matroska', // mkv
      'video/x-msvideo', // avi
      'video/avi',
      'video/quicktime', // mov
      'video/x-ms-wmv', // wmv
      'video/x-flv', // flv
      'video/webm',// webm
      'video/mpeg', //mpeg
      'application/octet-stream' // Fallback for cases like this
    ];

    // Extract the file extension and MIME type
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMIMETypes.includes(file.mimetype);

    // Check if the file extension and MIME type are allowed
    if (extname && mimetype) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid file type. Only MP4, MKV, AVI, MOV, MPEG, and WMV files are allowed.'));
    }
  }
});

router.post('/upload', optionalAuthorize, upload.single('video'), uploadVideo);
router.post('/convert', optionalAuthorize, upload.none(), convertVideo);
router.post('/reformat/:id', optionalAuthorize, upload.none(), reformatVideo);
router.delete('/delete/:id', optionalAuthorize, deleteVideo);
router.get('/download/:id', optionalAuthorize, downloadVideo);
router.get('/', authorize, getUserVideos);

export default router;
