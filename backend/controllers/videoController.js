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
    let format = path.extname(req.file.originalname).substring(1);

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
    const tempOutputPath = `/tmp/${videoId}.${outputFormat}`; // Temporary output file path

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;
    const MIN_PROGRESS_INCREMENT = 1;

    // Define codec settings and extra options based on the output format
    let videoCodec, audioCodec, extraOptions;

    switch (outputFormat) {
      case 'mkv':
        videoCodec = 'libx264';
        audioCodec = 'aac';
        extraOptions = ['-preset', 'medium'];
        break;
      case 'avi':
        videoCodec = 'mpeg4';
        audioCodec = 'mp3';
        extraOptions = ['-q:v', '3'];
        break;
      case 'mov':
        videoCodec = 'libx264';
        audioCodec = 'aac';
        extraOptions = ['-movflags', 'faststart'];
        break;
      case 'flv':
        videoCodec = 'flv1';
        audioCodec = 'mp3';
        extraOptions = [];
        break;
      case 'webm':
        videoCodec = 'libvpx';
        audioCodec = 'libvorbis';
        extraOptions = ['-deadline', 'realtime', '-cpu-used', '5'];
        break;
      case 'mp4':
        videoCodec = 'libx264';
        audioCodec = 'aac';
        extraOptions = ['-movflags', 'faststart'];
        break;
      default:
        console.error('Unsupported format:', outputFormat);
        return res.status(400).json({ message: 'Unsupported format requested.' });
    }

    // Use FFmpeg to process the video and save it to a temporary file
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .outputOptions(...extraOptions)
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .format(outputFormat)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine); // Debugging log to verify the FFmpeg command
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
        .on('end', resolve)
        .on('error', (err, stdout, stderr) => {
          console.error('Error during transcoding:', err.message);
          console.error('FFmpeg stdout:', stdout);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error('Failed to transcode video.'));
        })
        .save(tempOutputPath); // Save the output to a temporary file
    });

    // Upload the transcoded file to S3
    const fileStream = fs.createReadStream(tempOutputPath);
    await putObject(outputKey, fileStream);
    await updateVideoTranscodedPath(videoId, outputUrl, outputFormat);

    res.write('data: 100\n\n');
    res.end();

    // Cleanup temporary files
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempOutputPath);

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

    const transcodedKey = `transcoded/${video.videoId}.${video.transcodedFormat}`;
    const s3Stream = await getObject(transcodedKey);

    // Determine the content type based on the video format
    const format = path.extname(transcodedKey).substring(1).toLowerCase(); // Extract format from file extension
    const mimeTypes = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      webm: 'video/webm',
      flv: 'video/x-flv',
      mkv: 'video/x-matroska',
    };

    // Set the Content-Type based on the detected format, defaulting to a generic type if not found
    const contentType = mimeTypes[format] || 'application/octet-stream';

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${video.title || `downloaded_video.${format}`}"`);
    res.setHeader('Content-Type', contentType);

    // Pipe the S3 stream directly to the response
    s3Stream.Body.pipe(res).on('error', (err) => {
      console.error('Error streaming file:', err);
      return res.status(500).json({ message: 'Error during file download.', error: err.message });
    });

  } catch (err) {
    console.error('Error finding video:', err.message);
    return res.status(500).json({ message: 'Error finding video.', error: err.message });
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
    const transcodedFormat = video.transcodedFormat
    // Delete the video from S3
    await deleteObject(`uploads/${key}.${format}`);
    await deleteObject(`transcoded/${key}.${transcodedFormat}`);
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

