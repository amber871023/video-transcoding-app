const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { uploadVideo, transcodeVideo, downloadVideo } = require('../controllers/videoController');

// Multer setup for file uploads
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/upload', upload.single('video'), uploadVideo);
router.get('/', (req, res) => {
  Video.find().then(videos => res.json(videos)).catch(err => res.status(400).json(err));
});
router.post('/transcode', transcodeVideo);
router.get('/download/:id', downloadVideo);

module.exports = router;
