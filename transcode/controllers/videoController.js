import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { putObject,  getURLIncline } from '../services/S3.js';
import { getVideoById, updateVideoTranscodedPath} from '../models/Video.js';
import https from 'https';
import { SQSClient } from '@aws-sdk/client-sqs';

const sqsQueueUrl = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/group50-queue";
const client = new SQSClient({ region: "ap-southeast-2" });

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


export async function convertVideo(url, id, format) {
  //const videoId = req.body.videoId;
  // const outputFormat = req.body.format.toLowerCase();
  const tempFiles = [];

  try {
    // if (!videoId) {
    //   return res.status(400).json({ message: 'No video ID provided.' });
    // }

    const video = await getVideoById(id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    // const videoURL = video.originalVideoPath;
    const originalExtension = path.extname(new URL(url).pathname);
    // Check if the input format is the same as the requested output format
    if (originalExtension.replace('.', '').toLowerCase() === format) {
      return res.status(400).json({ message: 'Input format is the same as the output format. Cannot reformat.' });
    }
    const tempVideoPath = `/tmp/${id}${originalExtension}`;
    tempFiles.push(tempVideoPath); // Track temp file for cleanup

    // Download the video to a temporary path
    await downloadFileFromS3(url, tempVideoPath);
    if (!fs.existsSync(tempVideoPath)) {
      throw new Error(`File not downloaded correctly to ${tempVideoPath}`);
    }

    // Define transcoded output paths
    const outputKey = `transcoded/${id}.${format}`;
    const outputUrl = await getURLIncline(outputKey);
    const tempOutputPath = `/tmp/${id}.${format}`;
    tempFiles.push(tempOutputPath); // Track temp file for cleanup

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalDuration = 0;
    let lastProgress = 0;
    const MIN_PROGRESS_INCREMENT = 1;

    let videoCodec, audioCodec, extraOptions;
    switch (format) {
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
        .format(format)
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
    await updateVideoTranscodedPath(id, outputUrl, format);

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

