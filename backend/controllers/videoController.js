const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/Video');
const { putObject, getObject, getURL} = require('../services/S3');
const { PassThrough } = require('stream');
const { createVideo, getVideoById, getVideosByUserId, updateVideoTranscodedPath, deleteVideoRecord } = require('../models/Video');
const { v4: uuidv4 } = require('uuid');

// Upload Video
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    
    // Upload video directly to S3 using the buffer from req.file
    const videoBuffer = req.file.buffer;
    const videoKey = `uploads/${Date.now()}_${req.file.originalname}`;
    await putObject(videoKey, videoBuffer);

    // Use FFmpeg to take a screenshot from the video buffer
    // const tempFilePath = `/tmp/${Date.now()}_${req.file.originalname}`; // Temporary path for the video
    // const thumbnailPath = `/tmp/${Date.now()}_screenshot.png`; // Temporary path for the screenshot

    // // Write the buffer to a temporary file so FFmpeg can access it
    // const fs = require('fs');
    // fs.writeFileSync(tempFilePath, videoBuffer);

    // // Generate a thumbnail
    // await new Promise((resolve, reject) => {
    //   ffmpeg(tempFilePath)
    //     .screenshots({
    //       timestamps: ['10%'],
    //       filename: thumbnailPath,  // Save the screenshot
    //       folder: '/tmp',  // Temporary folder for the screenshot
    //       size: '320x240'
    //     })
    //     .on('end', resolve)
    //     .on('error', (err) => {
    //       reject(err);
    //     });
    // });

    //  // Upload the thumbnail to S3
    //  const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    //  const thumbnailKey = `thumbnails/${Date.now()}_${req.file.originalname}_thumbnail.png`;
    //  await putObject(thumbnailKey, thumbnailBuffer); // Upload the screenshot to S3

     
    const vidData = await getObject(videoKey);
    // Extract video metadata
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg(vidData.Body)
      .ffprobe( (err, metadata) => {
        if (err) {
          console.log('here');
          return reject(err);
        }
        resolve(metadata);
      });
    });

    // const videoPath = path.join(__dirname, '..', req.file.path);
    const format = path.extname(req.file.originalname).substring(1);
    const duration = metadata.format.duration;
    const size = req.file.size;
    const title = req.file.originalname;
    const videoId = uuidv4();
    const userId = req.user ? req.user.id : 'anonymous';  // Use "anonymous" for unauthenticated users
    const videoURL = await getURL(videoKey);

    const videoData = {
      'qut-username': process.env.QUT_USERNAME,
      videoId: videoId,
      title: title || 'Untitled Video',
      originalVideoPath: videoURL,
      format: format,
      size: size,
      duration: duration,
      //thumbnailPath: thumbnailPath,
      userId: userId,
      transcodedVideoPath: null,
    };

    // Cleanup: Delete the temporary files
    // fs.unlinkSync(tempFilePath);
    // fs.unlinkSync(thumbnailPath);
    
    // Save the video data to DynamoDB
    await createVideo(videoData);

    // Generate a thumbnail from video data
    // const thumbnailBuffer = await new Promise((resolve, reject) => {
    //   // Use a PassThrough stream for processing
    //   const passThrough = new PassThrough();
    //   passThrough.end(req.file.buffer); // End the stream with the buffer data

    //   ffmpeg()
    //     .input(passThrough)
    //     .screenshots({
    //       timestamps: ['00:00:10.000'],
    //       size: '320x240',
    //       // No need to specify folder or filename
    //     })
    //     .on('end', () => {
    //       // ffmpeg does not provide a direct way to handle the screenshot buffer
    //       // Ensure the 'end' event gets triggered to complete processing
    //       passThrough.end(); 
    //     })
    //     .on('error', (err) => {
    //       console.error('FFmpeg Error:', err); // Detailed error logging
    //       reject(err);
    //     })
    //     .on('data', (data) => {
    //       resolve(data); // Resolve with the screenshot data
    //       reject(err);
    //     });
    // });
     
    //  // Upload thumbnails to S3
    //  const thumbnailKey = `thumbnails/${Date.now()}_thumbnail.png`;
    //  await putObject(thumbnailKey, thumbnailBuffer);

    return res.status(201).json(videoData);

  } catch (err) {
    return res.status(500).json({ message: 'Error processing video upload.', error: err.message });
  }
};

exports.convertVideo = async (req, res) => {
  try {
    console.log('here');
    const videoId = req.body.videoId;

    if (!videoId) {
      return res.status(400).json({ message: 'No video ID provided.' });
    }

    const video = await getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    // const transcodedDir = path.join(__dirname, '..', 'transcoded_videos');
    // if (!fs.existsSync(transcodedDir)) {
    //   fs.mkdirSync(transcodedDir, { recursive: true });
    // }

    // Generate a unique key for the transcoded video in S3
    //const outputKey = `transcoded/${Date.now()}_${path.basename(video.originalVideoPath, path.extname(video.originalVideoPath))}.${req.body.format.toLowerCase()}`;
    const outputKey = `transcoded/${path.basename(video.originalVideoPath, path.extname(video.originalVideoPath))}.${req.body.format.toLowerCase()}`;


    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;
    const MIN_PROGRESS_INCREMENT = 1;

    // Create a PassThrough stream
    const passThroughStream = new PassThrough();

    // Start uploading the video to S3 while ffmpeg processes the video
    const uploadPromise = putObject(outputKey, passThroughStream);

    const ffmpegProcess = ffmpeg(video.originalVideoPath)
      .outputFormat(req.body.format.toLowerCase())
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
        // Wait the transcoded video path in the database
        await uploadPromise;
        const outputPath = `${process.env.S3_BUCKET}/${outputKey}`;
        await updateVideoTranscodedPath(videoId, outputPath);
        res.write('data: 100\n\n');
        res.end();
      })
      .on('error', (err) => {
        res.write('data: error\n\n');
        res.end();
      })
      .pipe(passThroughStream); // Pipe the ffmpeg output to the PassThrough stream

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