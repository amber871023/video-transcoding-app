const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/Video');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const videoPath = path.join(__dirname, '..', req.file.path);
    const format = path.extname(req.file.originalname).substring(1);

    // Ensure thumbnails directory exists
    const thumbnailDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // Extract video metadata
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });

    const duration = metadata.format.duration;
    const size = req.file.size;
    const title = req.file.originalname;

    // Generate a thumbnail
    const thumbnailPath = path.join('uploads', 'thumbnails', `${req.file.filename}-thumbnail.png`);
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['10%'],
          filename: `${req.file.filename}-thumbnail.png`,
          folder: 'uploads/thumbnails',
          size: '320x240'
        })
        .on('end', resolve)
        .on('error', reject);
    });


    // Create a new video document
    const newVideo = new Video({
      username: req.user ? req.user.username : null,
      userId: req.user ? req.user.id : null,
      title: title || 'Untitled Video',
      originalVideoPath: videoPath,
      format: format,
      size: size,
      duration: duration,
      thumbnailPath: thumbnailPath,
    });

    // Save the video to the database
    const savedVideo = await newVideo.save();
    return res.json(savedVideo);

  } catch (err) {
    console.error('Error processing video upload:', err);
    return res.status(500).json({ message: 'Error processing video upload.', error: err.message });
  }
};

exports.transcodeVideo = async (req, res) => {
  try {
    const videoId = req.body.videoId;

    if (!videoId) {
      return res.status(400).json({ message: 'No video ID provided.' });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const outputPath = video.originalVideoPath.replace(/\.([^\.]+)$/, `-transcoded.${req.body.format.toLowerCase()}`);

    await new Promise((resolve, reject) => {
      ffmpeg(video.originalVideoPath)
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    video.transcodedVideoPath = outputPath;
    await video.save();

    return res.json({ message: 'Transcoding completed', video });

  } catch (err) {
    console.error('Error during transcoding:', err);
    return res.status(500).json({ message: 'Error during transcoding.', error: err });
  }
};

exports.downloadVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || !video.transcodedVideoPath) {
      return res.status(404).json({ message: 'Video or transcoded file not found.' });
    }

    res.download(video.transcodedVideoPath, err => {
      if (err) {
        console.error('Error during file download:', err);
        return res.status(500).json({ message: 'Error during file download.', error: err });
      }
    });

  } catch (err) {
    console.error('Error finding video:', err);
    return res.status(500).json({ message: 'Error finding video.', error: err });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    console.log('Deleting video with ID:', videoId);

    const video = await Video.findByIdAndDelete(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Construct the correct paths for the original video and thumbnail
    const originalVideoPath = path.isAbsolute(video.originalVideoPath)
      ? video.originalVideoPath
      : path.join(__dirname, '..', video.originalVideoPath);

    const thumbnailPath = path.isAbsolute(video.thumbnailPath)
      ? video.thumbnailPath
      : path.join(__dirname, '..', video.thumbnailPath);

    // Delete associated files
    if (fs.existsSync(originalVideoPath)) {
      fs.unlinkSync(originalVideoPath);
    } else {
      console.warn(`Original video file not found: ${originalVideoPath}`);
    }

    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    } else {
      console.warn(`Thumbnail file not found: ${thumbnailPath}`);
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Error deleting video' });
  }
};
