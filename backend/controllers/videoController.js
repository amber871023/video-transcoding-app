const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { createVideo, getVideoById, getVideosByUserId, updateVideoTranscodedPath, deleteVideoRecord } = require('../models/Video');
const { v4: uuidv4 } = require('uuid');

// Upload Video
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
        if (err) {
          return reject(err);
        }
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
        .on('error', (err) => {
          reject(err);
        });
    });

    const videoId = uuidv4();
    const userId = req.user ? req.user.id : null;
    const videoData = {
      'qut-username': process.env.QUT_USERNAME,
      videoId: videoId,
      title: title || 'Untitled Video',
      originalVideoPath: videoPath,
      format: format,
      size: size,
      duration: duration,
      thumbnailPath: thumbnailPath,
      userId: userId,
      transcodedVideoPath: null,
    };

    // Save the video data to DynamoDB
    await createVideo(videoData);

    return res.status(201).json(videoData);

  } catch (err) {
    return res.status(500).json({ message: 'Error processing video upload.', error: err.message });
  }
};

exports.convertVideo = async (req, res) => {
  try {
    const videoId = req.body.videoId;

    if (!videoId) {
      return res.status(400).json({ message: 'No video ID provided.' });
    }

    const video = await getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const transcodedDir = path.join(__dirname, '..', 'transcoded_videos');
    if (!fs.existsSync(transcodedDir)) {
      fs.mkdirSync(transcodedDir, { recursive: true });
    }

    const outputFileName = `${path.basename(video.originalVideoPath, path.extname(video.originalVideoPath))}-transcoded.${req.body.format.toLowerCase()}`;
    const outputPath = path.join(transcodedDir, outputFileName);

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;

    const MIN_PROGRESS_INCREMENT = 1;

    const ffmpegProcess = ffmpeg(video.originalVideoPath)
      .output(outputPath)
      .on('start', (commandLine) => { })
      .on('codecData', (data) => {
        const durationParts = data.duration.split(':');
        totalDuration = parseFloat(durationParts[0]) * 3600 + parseFloat(durationParts[1]) * 60 + parseFloat(durationParts[2]);
      })
      .on('progress', (progress) => {
        const timeParts = progress.timemark.split(':');
        const currentTime = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
        let percentComplete = (currentTime / totalDuration) * 100;

        if (!isNaN(percentComplete) && percentComplete > lastProgress) {
          if ((percentComplete - lastProgress) >= MIN_PROGRESS_INCREMENT) {
            res.write(`data: ${Math.round(percentComplete)}\n\n`);
            lastProgress = percentComplete;
          }
        }
      })
      .on('end', async () => {
        await updateVideoTranscodedPath(video.videoId, outputPath);
        res.write('data: 100\n\n');
        res.end();
      })
      .on('error', (err) => {
        res.write('data: error\n\n');
        res.end();
      });

    req.on('close', () => {
      ffmpegProcess.kill();
    });

    ffmpegProcess.run();

  } catch (err) {
    return res.status(500).json({ message: 'Error during transcoding.', error: err });
  }
};

// Download Video
exports.downloadVideo = async (req, res) => {
  try {
    const video = await getVideoById(req.params.id);
    console.log('Retrieved video:', video);
    if (!video || !video.transcodedVideoPath) {
      return res.status(404).json({ message: 'Video or transcoded file not found.' });
    }

    res.download(video.transcodedVideoPath, err => {
      if (err) {
        return res.status(500).json({ message: 'Error during file download.', error: err });
      }
    });

  } catch (err) {
    return res.status(500).json({ message: 'Error finding video.', error: err });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const videoId = req.params.id;

    const video = await getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Resolve paths for original, thumbnail, and transcoded files
    const originalVideoPath = path.resolve(video.originalVideoPath);
    const thumbnailPath = path.resolve(video.thumbnailPath);
    const transcodedVideoPath = video.transcodedVideoPath ? path.resolve(video.transcodedVideoPath) : null;

    // Delete associated files if they exist
    if (fs.existsSync(originalVideoPath)) fs.unlinkSync(originalVideoPath);
    else console.warn(`Original video file not found: ${originalVideoPath}`);

    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
    else console.warn(`Thumbnail file not found: ${thumbnailPath}`);

    if (transcodedVideoPath && fs.existsSync(transcodedVideoPath)) fs.unlinkSync(transcodedVideoPath);
    else console.warn(`Transcoded video file not found: ${transcodedVideoPath}`);

    // Delete the video record from DynamoDB
    await deleteVideoRecord(videoId);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Error deleting video' });
  }
};

exports.getUserVideos = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ error: true, msg: 'User ID not found in request.' });
    }
    const videos = await getVideosByUserId(userId);
    res.json(videos);
  } catch (err) {
    console.error('Error fetching user videos:', err);
    res.status(500).json({ error: true, msg: 'Failed to fetch videos', errorDetails: err.message });
  }
};

// Reformat Video
exports.reformatVideo = async (req, res) => {
  try {
    const video = await getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const inputPath = path.resolve(video.transcodedVideoPath);
    console.log('Input Path:', inputPath);

    const outputFilename = `video-${Date.now()}-transcoded.${req.body.format}`;
    const outputPath = path.resolve(__dirname, '../transcoded_videos', outputFilename);

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;

    const ffmpegProcess = ffmpeg(inputPath)
      .toFormat(req.body.format)
      .output(outputPath)
      .on('start', (commandLine) => { })
      .on('codecData', (data) => {
        const durationParts = data.duration.split(':');
        totalDuration = parseFloat(durationParts[0]) * 3600 + parseFloat(durationParts[1]) * 60 + parseFloat(durationParts[2]);
      })
      .on('progress', (progress) => {
        const timeParts = progress.timemark.split(':');
        const currentTime = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
        const percentComplete = Math.round((currentTime / totalDuration) * 100);

        if (percentComplete > lastProgress) {
          res.write(`data: ${percentComplete}\n\n`);
          lastProgress = percentComplete;
        }
      })
      .on('end', async () => {
        await updateVideoTranscodedPath(video.videoId, outputPath);
        res.write('data: 100\n\n');
        res.end();
      })
      .on('error', (err) => {
        res.write(`data: error\n\n`);
        res.end();
      });

    req.on('close', () => {
      ffmpegProcess.kill();
    });

    ffmpegProcess.run();

  } catch (err) {
    console.error('Error in reformatVideo controller:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};
