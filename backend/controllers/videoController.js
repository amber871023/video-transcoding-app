import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { putObject, getObject, getURLIncline, deleteObject } from '../services/S3.js';
import { PassThrough } from 'stream';
import { createVideo, getVideoById, getVideosByUserId, updateVideoTranscodedPath, deleteVideoRecord } from '../models/Video.js';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import { getParameter } from '../services/Parameterstore.js';

const qutUsername = await getParameter('/n11422807/group50/QUT_USERNAME');

export const uploadVideo = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Upload video directly to S3 using the buffer from req.file
    const videoBuffer = req.file.buffer;
    const videoId = uuidv4();
    const format = path.extname(req.file.originalname).substring(1);
    const videoKey = `uploads/${videoId}.${format}`;
    await putObject(videoKey, videoBuffer);

    // Get the URL of the uploaded video
    const videoURL = await getURLIncline(videoKey);

    // Paths for temporary thumbnail storage
    const thumbnailPath = `/tmp/${Date.now()}_screenshot.png`;

    // Generate a thumbnail using the videoURL directly
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(videoURL)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: '320x240',
          })
          .on('end', resolve)
          .on('error', (err) => {
            console.error('Error generating thumbnail:', err.message);
            reject(new Error('Failed to generate thumbnail.'));
          });
      });
    } catch (err) {
      console.error('Error generating thumbnail:', err.message);
      throw new Error('Failed to generate thumbnail.');
    }

    // Upload the thumbnail to S3
    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    const thumbnailKey = `thumbnails/${videoId}.png`;
    await putObject(thumbnailKey, thumbnailBuffer);
    const thumbnailURL = await getURLIncline(thumbnailKey);

    // Extract video metadata
    const vidData = await getObject(videoKey);
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg(vidData.Body).ffprobe((err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });

    // Video information for storing in the database
    const duration = metadata.format.duration;
    const size = req.file.size;
    const title = req.file.originalname;
    const userId = req.user ? req.user.id : 'anonymous';
    console.log("print", userId)
    const videoData = {
      'qut-username': qutUsername,
      videoId,
      title,
      originalVideoPath: videoURL,
      format,
      size,
      duration,
      thumbnailPath: thumbnailURL,
      s3Key: videoId,
      userId,
      transcodedVideoPath: null,
    };

    // Cleanup temp files
    try {
      fs.unlinkSync(thumbnailPath);
    } catch (cleanupErr) {
      console.warn('Error cleaning up temp files:', cleanupErr.message);
    }

    // Save video data to DynamoDB
    await createVideo(videoData);
    return res.status(201).json(videoData);

  } catch (err) {
    console.error('Error processing video upload:', err.message);
    return res.status(500).json({ message: 'Error processing video upload.', error: err.message });
  }
};

// Function to safely download a file from S3
function downloadFileFromS3(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.error(`Failed to download file: Status code ${response.statusCode}`);
        return reject(new Error(`Failed to download file: ${response.statusCode}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          resolve();
        });
      });
    }).on('error', (err) => {
      console.error('Error during download:', err.message);
      fs.unlink(outputPath, () => reject(err));
    });
  });
}
export const convertVideo = async (req, res) => {
  try {
    const videoId = req.body.videoId;
    if (!videoId) {
      return res.status(400).json({ message: 'No video ID provided.' });
    }

    const video = await getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const videoURL = video.originalVideoPath;
    const originalExtension = path.extname(new URL(videoURL).pathname);
    const tempVideoPath = `/tmp/${videoId}${originalExtension}`;

    // Download the video to a temporary path
    await downloadFileFromS3(videoURL, tempVideoPath);

    if (!fs.existsSync(tempVideoPath)) {
      throw new Error(`File not downloaded correctly to ${tempVideoPath}`);
    }

    // Set up the output format and path
    const outputFormat = req.body.format.toLowerCase();
    const outputKey = `transcoded/${videoId}.${outputFormat}`;
    const outputUrl = await getURLIncline(outputKey);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;
    const MIN_PROGRESS_INCREMENT = 1;

    // Create a PassThrough stream for upload
    const passThroughStream = new PassThrough();
    const uploadPromise = putObject(outputKey, passThroughStream);

    // Use FFmpeg to process the video
    ffmpeg(tempVideoPath)
      .outputFormat(outputFormat)
      .outputOptions('-movflags frag_keyframe+empty_moov+default_base_moof') // Options for MP4 compatibility
      .videoCodec('libx264')
      .audioCodec('aac')
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
        await uploadPromise;
        await updateVideoTranscodedPath(videoId, outputUrl, outputFormat);
        res.write('data: 100\n\n');
        res.end();
        fs.unlinkSync(tempVideoPath);
      })
      .on('error', (err) => {
        console.error('Error during transcoding:', err.message);
        res.write('data: error\n\n');
        res.end();
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
      })
      .pipe(passThroughStream); // Use .pipe() to handle streaming to the upload

    req.on('close', () => {
      if (fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
    });

  } catch (err) {
    console.error('Error during transcoding:', err.message);
    return res.status(500).json({ message: 'Error during transcoding.', error: err.message });
  }
};

// Download Video
export const downloadVideo = async (req, res) => {
  try {
    const video = await getVideoById(req.params.id);
    if (!video || !video.transcodedVideoPath) {
      return res.status(404).json({ message: 'Video or transcoded file not found.' });
    }
    // Get the video file from S3
    const trasncodedKey = `transcoded/${video.videoId}.${video.transcodedFormat}`;
    const s3Stream = await getObject(trasncodedKey);

    // Set headers for the file download
    res.setHeader('Content-Disposition', `attachment; filename="${video.title || 'video.mp4'}"`);
    res.setHeader('Content-Type', 'video/mp4'); // Adjust this based on the video content type

    // Pipe the S3 stream directly to the response
    s3Stream.Body.pipe(res).on('error', (err) => {
      console.error('Error streaming file:', err);
      return res.status(500).json({ message: 'Error during file download.', error: err });
    });

  } catch (err) {
    console.error('Error finding video:', err);
    return res.status(500).json({ message: 'Error finding video.', error: err });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const videoId = req.params.id;

    const video = await getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    const key = video.s3Key;
    const format = video.format
    // Delete the video from S3
    await deleteObject(`uploads/${key}.${format}`);
    await deleteObject(`transcoded/${key}`);
    await deleteObject(`thumbnails/${key}.png`);

    // Delete the video record from DynamoDB
    await deleteVideoRecord(videoId);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Error deleting video' });
  }
};

export const getUserVideos = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId)
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
export const reformatVideo = async (req, res) => {
  try {
    const video = await getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const inputPath = video.originalVideoPath;
    if (!inputPath) {
      return res.status(400).json({ message: 'Original transcoded path is missing.' });
    }

    const outputFormat = req.body.format.toLowerCase();
    const outputKey = `transcoded/${video.videoId}.${outputFormat}`;
    const outputUrl = await getURLIncline(outputKey);

    // Set response headers for server-sent events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;
    const MIN_PROGRESS_INCREMENT = 1;

    const passThroughStream = new PassThrough();
    const uploadPromise = putObject(outputKey, passThroughStream);

    // Use FFmpeg to reformat the video
    ffmpeg(inputPath)
      .outputFormat(outputFormat)
      .outputOptions('-movflags frag_keyframe+empty_moov+default_base_moof') // For MP4 compatibility
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('start', (commandLine) => {
      })
      .on('codecData', (data) => {
        // Calculate total duration of the video from codec data
        const durationParts = data.duration.split(':');
        totalDuration = parseFloat(durationParts[0]) * 3600 + parseFloat(durationParts[1]) * 60 + parseFloat(durationParts[2]);
      })
      .on('progress', (progress) => {
        // Calculate the current progress percentage
        const timeParts = progress.timemark.split(':');
        const currentTime = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
        let percentComplete = (currentTime / totalDuration) * 100;

        // Send progress updates to the client
        if (!isNaN(percentComplete) && percentComplete > lastProgress) {
          if ((percentComplete - lastProgress) >= MIN_PROGRESS_INCREMENT) {
            res.write(`data: ${Math.round(percentComplete)}\n\n`);
            lastProgress = percentComplete;
          }
        }
      })
      .on('end', async () => {
        // Complete the upload process and update the database
        await uploadPromise;
        await updateVideoTranscodedPath(video.videoId, outputUrl, outputFormat);
        res.write('data: 100\n\n');
        res.end();
      })
      .on('error', (err) => {
        console.error('Error during reformatting:', err.message);
        res.write('data: error\n\n');
        res.end();
      })
      .pipe(passThroughStream); // Stream the FFmpeg output to the PassThrough stream

  } catch (err) {
    console.error('Error in reformatVideo controller:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

