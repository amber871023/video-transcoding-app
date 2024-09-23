const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/Video');
const { putObject, getObject} = require('../services/S3');
const { PassThrough } = require('stream');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // const videoPath = path.join(__dirname, '..', req.file.path);
    const format = path.extname(req.file.originalname).substring(1);
    
    // Upload video directly to S3 using the buffer from req.file
    const videoBuffer = req.file.buffer;
    const videoKey = `uploads/${Date.now()}_${req.file.originalname}`;
    await putObject(videoKey, videoBuffer);

    const videoData = await getObject(videoKey);

    // Extract video metadata
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg(videoData.Body)
      .ffprobe( (err, metadata) => {
        if (err) {
          return reject(err);
        }
        resolve(metadata);
      });
    });

    const duration = metadata.format.duration;
    const size = req.file.size;
    const title = req.file.originalname;

    // Generate a thumbnail from video data
    const thumbnailBuffer = await new Promise((resolve, reject) => {
      // Use a PassThrough stream for processing
      const passThrough = new PassThrough();
      passThrough.end(req.file.buffer); // End the stream with the buffer data

      ffmpeg()
        .input(passThrough)
        .screenshots({
          timestamps: ['00:00:10.000'],
          size: '320x240',
          // No need to specify folder or filename
        })
        .on('end', () => {
          // ffmpeg does not provide a direct way to handle the screenshot buffer
          // Ensure the 'end' event gets triggered to complete processing
          passThrough.end(); 
        })
        .on('error', (err) => {
          console.error('FFmpeg Error:', err); // Detailed error logging
          reject(err);
        })
        .on('data', (data) => {
          resolve(data); // Resolve with the screenshot data
        });
    });
     
     // Upload thumbnails to S3
     const thumbnailKey = `thumbnails/${Date.now()}_thumbnail.png`;
     await putObject(thumbnailKey, thumbnailBuffer);

    return res.status(200).json({ message: 'Video uploaded successfully', videoKey });
    // Create a new video document
    // const newVideo = new Video({
    //   userId: req.user ? req.user.id : null,
    //   title: title || 'Untitled Video',
    //   originalVideoPath: videoPath,
    //   format: format,
    //   size: size,
    //   duration: duration,
    //   thumbnailPath: thumbnailPath,
    // });



  } catch (err) {
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
      })
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
        video.transcodedVideoPath = outputPath;//fmpeg process completed
        await video.save();
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

exports.downloadVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
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

    const outputFilename = `video-${Date.now()}-transcoded.${req.body.format}`;
    const outputPath = path.resolve(__dirname, '../transcoded_videos', outputFilename);

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
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
      })
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
        video.transcodedVideoPath = outputPath;//ffmpeg process completed
        await video.save();

        res.write('data: 100\n\n');
        res.end(); //Reformatting complete
      })
      .on('error', (err) => {
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