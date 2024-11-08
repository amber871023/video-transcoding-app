import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { putObject, getObject, getURLIncline, deleteObject } from '../services/S3.js';
import { createVideo, getVideoById, getVideosByUserId, updateVideoTranscodedPath, deleteVideoRecord } from '../models/Video.js';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

export const uploadVideo = async (req, res) => {
  const tempFiles = []; // Track temporary files for cleanup
  let videoKey = '';
  let thumbnailKey = '';
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const videoBuffer = req.file.buffer;
    const videoId = uuidv4();
    let format = path.extname(req.file.originalname).substring(1);
    videoKey = `uploads/${videoId}.${format}`;

    // Attempt to upload video directly to S3
    try {
      await putObject(videoKey, videoBuffer);
    } catch (uploadError) {
      console.error('Error uploading video to S3:', uploadError.message);
      return res.status(500).json({ message: 'Failed to upload video to S3.', error: uploadError.message });
    }

    const videoURL = await getURLIncline(videoKey);

    // Generate a thumbnail
    const thumbnailPath = `/tmp/${Date.now()}_screenshot.png`;
    tempFiles.push(thumbnailPath);

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

    // Attempt to upload the thumbnail to S3
    try {
      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      thumbnailKey = `thumbnails/${videoId}.png`;
      await putObject(thumbnailKey, thumbnailBuffer);
    } catch (uploadError) {
      console.error('Error uploading thumbnail to S3:', uploadError.message);
      // Rollback: delete the uploaded video if thumbnail upload fails
      await deleteObject(videoKey);
      return res.status(500).json({ message: 'Failed to upload thumbnail to S3.', error: uploadError.message });
    }

    const thumbnailURL = await getURLIncline(thumbnailKey);

    // Retrieve video metadata
    const vidData = await getObject(videoKey);
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg(vidData.Body).ffprobe((err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });

    // Prepare video data for DynamoDB
    const videoData = {
      videoId,
      title: req.file.originalname,
      originalVideoPath: videoURL,
      format,
      size: req.file.size,
      duration: metadata.format.duration || 0, // Duration can be updated later or extracted directly if needed
      thumbnailPath: thumbnailURL,
      s3Key: videoKey,
      userId: req.user ? req.user.id : 'anonymous',
      transcodedVideoPath: null,
    };

    // Attempt to save video metadata to DynamoDB
    try {
      await createVideo(videoData);
    } catch (dbError) {
      console.error('Error saving video metadata to DynamoDB:', dbError.message);
      // Rollback: delete the uploaded video and thumbnail if DynamoDB save fails
      await deleteObject(videoKey);
      await deleteObject(thumbnailKey);
      return res.status(500).json({ message: 'Failed to save video metadata.', error: dbError.message });
    }

    // Cleanup temporary files
    fs.unlinkSync(thumbnailPath);

    res.status(201).json(videoData);
  } catch (err) {
    // General error handling
    console.error('Error processing video upload:', err.message);

    // Rollback: delete uploaded video and thumbnail on general failure
    if (videoKey) await deleteObject(videoKey);
    if (thumbnailKey) await deleteObject(thumbnailKey);

    res.status(500).json({ message: 'Error processing video upload.', error: err.message });
  } finally {
    // Cleanup any remaining temporary files
    tempFiles.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
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
  const videoId = req.body.videoId;
  const outputFormat = req.body.format.toLowerCase();
  const tempFiles = [];

  try {
    if (!videoId) {
      return res.status(400).json({ message: 'No video ID provided.' });
    }

    const video = await getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const videoURL = video.originalVideoPath;
    const originalExtension = path.extname(new URL(videoURL).pathname);
    // Check if the input format is the same as the requested output format
    if (originalExtension.replace('.', '').toLowerCase() === outputFormat) {
      return res.status(400).json({ message: 'Input format is the same as the output format. Cannot reformat.' });
    }
    const tempVideoPath = `/tmp/${videoId}${originalExtension}`;
    tempFiles.push(tempVideoPath); // Track temp file for cleanup

    // Download the video to a temporary path
    await downloadFileFromS3(videoURL, tempVideoPath);
    if (!fs.existsSync(tempVideoPath)) {
      throw new Error(`File not downloaded correctly to ${tempVideoPath}`);
    }

    // Define transcoded output paths
    const outputKey = `transcoded/${videoId}.${outputFormat}`;
    const outputUrl = await getURLIncline(outputKey);
    const tempOutputPath = `/tmp/${videoId}.${outputFormat}`;
    tempFiles.push(tempOutputPath); // Track temp file for cleanup

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;
    const MIN_PROGRESS_INCREMENT = 1;

    let videoCodec, audioCodec, extraOptions;
    switch (outputFormat) {
      case 'mpeg':
        videoCodec = 'mpeg2video';
        audioCodec = 'mp2';
        extraOptions = ['-q:v', '3'];
        break;
      case 'avi':
        videoCodec = 'mpeg4';
        audioCodec = 'ac3';
        extraOptions = ['-q:v', '3'];
        break;
      case 'mov':
        videoCodec = 'libx264';
        audioCodec = 'aac';
        extraOptions = ['-movflags', 'faststart'];
        break;
      case 'flv':
        videoCodec = 'libx264';
        audioCodec = 'aac';
        extraOptions = ['-preset', 'veryfast', '-tune', 'zerolatency'];
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
        throw new Error('Unsupported format requested.');
    }

    // Use FFmpeg to process the video and save it to a temporary file
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .outputOptions(...extraOptions)
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .format(outputFormat)
        // .on('start', (commandLine) => {
        //   console.log('FFmpeg command:', commandLine);
        // })
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
          // console.error('Error during transcoding:', err.message);
          reject(err);
        })
        .save(tempOutputPath);
    });

    // Upload the transcoded file to S3
    const fileStream = fs.createReadStream(tempOutputPath);
    await putObject(outputKey, fileStream);
    await updateVideoTranscodedPath(videoId, outputUrl, outputFormat);

    res.write('data: 100\n\n');
    res.end();
  } catch (err) {
    console.error('Error during transcoding:', err.message);
    res.status(500).json({ message: 'Error during transcoding.', error: err.message });
  } finally {
    // Cleanup temporary files
    tempFiles.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
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
      mpeg: 'video/mpeg',
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

    const format = video.format
    const transcodedFormat = video.transcodedFormat
    // Delete the video from S3
    await deleteObject(`uploads/${video.videoId}.${format}`);
    await deleteObject(`transcoded/${video.videoId}.${transcodedFormat}`);
    await deleteObject(`thumbnails/${video.videoId}.png`);

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

export const reformatVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    if (!videoId) {
      return res.status(400).json({ message: 'No video ID provided.' });
    }

    const video = await getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const videoURL = video.originalVideoPath;
    const originalExtension = path.extname(new URL(videoURL).pathname);
    const outputFormat = req.body.format.toLowerCase();
    // Check if the input format is the same as the requested output format
    if (originalExtension.replace('.', '').toLowerCase() === outputFormat) {
      return res.status(400).json({ message: 'Input format is the same as the output format. Cannot reformat.' });
    }
    const tempVideoPath = `/tmp/${videoId}${originalExtension}`;

    // Download the video to a temporary path
    await downloadFileFromS3(videoURL, tempVideoPath);

    if (!fs.existsSync(tempVideoPath)) {
      throw new Error(`File not downloaded correctly to ${tempVideoPath}`);
    }

    // Set up the output format and path
    const outputKey = `transcoded/${videoId}.${outputFormat}`;
    const outputUrl = await getURLIncline(outputKey);
    const tempOutputPath = `/tmp/${videoId}.${outputFormat}`;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;
    const MIN_PROGRESS_INCREMENT = 1;

    // Send heartbeat to keep connection alive during long conversions
    const heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n'); // Send a comment to keep the connection alive
    }, 15000); // Every 15 seconds

    let videoCodec, audioCodec, extraOptions;

    switch (outputFormat) {
      case 'mpeg':
        videoCodec = 'mpeg2video';
        audioCodec = 'mp2';
        extraOptions = ['-q:v', '3'];
        break;
      case 'avi':
        videoCodec = 'mpeg4';
        audioCodec = 'ac3';
        extraOptions = ['-q:v', '3'];
        break;
      case 'mov':
        videoCodec = 'libx264';
        audioCodec = 'aac';
        extraOptions = ['-movflags', 'faststart'];
        break;
      case 'flv':
        videoCodec = 'libx264';
        audioCodec = 'aac';
        extraOptions = ['-preset', 'veryfast', '-tune', 'zerolatency'];
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

    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .outputOptions(...extraOptions)
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .format(outputFormat)
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
          console.error('Error during reformatting:', err.message);
          console.error('FFmpeg stdout:', stdout);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error('Failed to reformat video.'));
        })
        .save(tempOutputPath);
    });

    const fileStream = fs.createReadStream(tempOutputPath);
    await putObject(outputKey, fileStream);
    await updateVideoTranscodedPath(videoId, outputUrl, outputFormat);

    // Send final 100% progress
    res.write('data: 100\n\n');
    clearInterval(heartbeatInterval);
    res.end();

    // Clean up temporary files
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempOutputPath);

    // Stop heartbeat interval
    clearInterval(heartbeatInterval);

  } catch (err) {
    console.error('Error during reformatting:', err.message);
    res.write('data: error\n\n');
    res.end();

    // Stop heartbeat interval in case of error
    clearInterval(heartbeatInterval);
  }
};
