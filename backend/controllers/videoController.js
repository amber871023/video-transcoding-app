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
          reject(err);//Error generating thumbnail
        });
    });

    // Create a new video document
    const newVideo = new Video({
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
    console.log('Video saved to database:', savedVideo);
    return res.json(savedVideo);

  } catch (err) {
    console.error('Error processing video upload:', err);
    return res.status(500).json({ message: 'Error processing video upload.', error: err.message });
  }
};

const activeConversions = {}; // This object will store progress keyed by video IDs
exports.convertVideo = async (req, res) => {
  try {
    const videoId = req.body.videoId;

    if (!videoId) {
      return res.status(400).json({ message: 'No video ID provided.' });
    }

    const video = await Video.findById(videoId);
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
    let lastProgress = 0; // Initialize last progress

    const MIN_PROGRESS_INCREMENT = 1;

    const ffmpegProcess = ffmpeg(video.originalVideoPath)
      .output(outputPath)
      .on('start', (commandLine) => {
        // console.log(`ffmpeg process started: ${commandLine}`);
      })
      .on('codecData', (data) => {
        const durationParts = data.duration.split(':');
        totalDuration = parseFloat(durationParts[0]) * 3600 + parseFloat(durationParts[1]) * 60 + parseFloat(durationParts[2]);
        // console.log(`Total duration: ${totalDuration} seconds`);
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
        console.log('ffmpeg process completed');
        video.transcodedVideoPath = outputPath;
        await video.save();
        res.write('data: 100\n\n');
        res.end();
      })
      .on('error', (err) => {
        console.error('Error during transcoding:', err);
        res.write('data: error\n\n');
        res.end();
      });

    req.on('close', () => {
      ffmpegProcess.kill();
    });

    ffmpegProcess.run();

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

exports.getUserVideos = async (req, res) => {
  try {
    const userId = req.user.id;
    const videos = await Video.find({ userId });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: true, msg: 'Failed to fetch videos' });
  }
};

exports.reformatVideo = async (req, res) => {
  try {
    console.log('Reformat request received for video ID:', req.params.id);

    const video = await Video.findById(req.params.id);
    if (!video) {
      console.error('Video not found');
      return res.status(404).json({ message: 'Video not found' });
    }

    const inputPath = path.resolve(video.transcodedVideoPath);
    console.log('Input path resolved:', inputPath);

    const outputFilename = `video-${Date.now()}-reformatted.${req.body.format}`;
    const outputPath = path.resolve(__dirname, '../transcoded_videos', outputFilename);
    console.log('Output path resolved:', outputPath);

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      console.log('Created transcoded videos directory:', path.dirname(outputPath));
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;

    const ffmpegProcess = ffmpeg(inputPath)
      .toFormat(req.body.format)
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('ffmpeg process started:', commandLine);
      })
      .on('codecData', (data) => {
        const durationParts = data.duration.split(':');
        totalDuration = parseFloat(durationParts[0]) * 3600 + parseFloat(durationParts[1]) * 60 + parseFloat(durationParts[2]);
        console.log(`Total duration: ${totalDuration} seconds`);
      })
      .on('progress', (progress) => {
        const timeParts = progress.timemark.split(':');
        const currentTime = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
        const percentComplete = Math.round((currentTime / totalDuration) * 100);

        if (percentComplete > lastProgress) {
          res.write(`data: ${percentComplete}\n\n`);
          lastProgress = percentComplete;
          console.log(`Progress: ${percentComplete}%`);
        }
      })
      .on('end', async () => {
        console.log('ffmpeg process completed');
        video.transcodedVideoPath = outputPath;
        await video.save();

        res.write('data: 100\n\n');
        res.end();
        console.log('Reformatting complete, response sent.');
      })
      .on('error', (err) => {
        console.error('Error during reformatting:', err.message);
        res.write(`data: error\n\n`);
        res.end();
      });

    req.on('close', () => {
      ffmpegProcess.kill();
      console.log('Client disconnected, stopping reformatting process.');
    });

    ffmpegProcess.run();

  } catch (err) {
    console.error('Error in reformatVideo controller:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};
