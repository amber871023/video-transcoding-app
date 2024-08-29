const express = require('express');
const router = express.Router();
const multer = require('multer');
const Video = require('../models/Video');
const { authorize } = require('../middlewares/auth');
const optionalAuthorize = require('../middlewares/optAuth');
const { uploadVideo, transcodeVideo, downloadVideo, deleteVideo } = require('../controllers/videoController');
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
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /mp4|mkv|avi|mov|wmv/;
    const allowedMIMETypes = [
      'video/mp4',
      'video/x-matroska', // mkv
      'video/x-msvideo', // avi
      'video/avi',
      'video/quicktime', // mov
      'video/x-ms-wmv', // wmv
      'application/octet-stream' // Fallback for cases like this
    ];

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMIMETypes.includes(file.mimetype);

    // If MIME type is generic (like application/octet-stream), rely on extension
    if (mimetype || (file.mimetype === 'application/octet-stream' && extname)) {
      return cb(null, true);
    } else {
      console.error('File rejected due to invalid type:', file.originalname);
      cb(new Error('Only video files are allowed!'));
    }
  }
});


router.post('/upload', optionalAuthorize, upload.single('video'), uploadVideo);
router.get('/', (req, res) => {
  Video.find().then(videos => res.json(videos)).catch(err => res.status(400).json(err));
});
router.post('/transcode', transcodeVideo);
router.delete('/delete/:id', optionalAuthorize, deleteVideo);
router.get('/download/:id', downloadVideo);


module.exports = router;
