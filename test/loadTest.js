const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.argv[2] || "http://13.238.201.217:3001/api";
const numberOfRequests = 20; // Adjust the number of requests for load testing
const videoFilePath = path.resolve(__dirname, 'file_example_WMV.wmv'); // Replace with your video file path

async function loadTest() {
  let totalResponseTime = 0;

  for (let i = 0; i < numberOfRequests; i++) {
    const startTime = Date.now();

    try {
      // Upload the video to initiate the conversion
      const uploadResponse = await uploadVideo();
      const videoId = uploadResponse._id;

      // Wait for the video to be uploaded and start conversion
      // const conversionResponse
      //   = await convertVideo(videoId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      totalResponseTime += responseTime;

      console.log(`Request ${i + 1} completed in ${responseTime}ms`);
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error.message);
    }
  }

  const averageResponseTime = totalResponseTime / numberOfRequests;
  console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
}

// Function to upload the video
async function uploadVideo() {
  try {
    const form = new FormData();
    form.append('video', fs.createReadStream(videoFilePath));
    form.append('format','mov');
    const response = await axios.post(`${API_BASE_URL}/videos/upload`, form, {
      headers: form.getHeaders(),
    });

    console.log('Video uploaded successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading video:', error.message);
    throw error;
  }
}

// Function to convert the uploaded video
// async function convertVideo(videoId) {
//   try {
//     const form = new FormData();
//     form.append('videoId', videoId);
//     form.append('format', 'mp4'); // Specify the desired output format

//     const response = await axios.post(`${API_BASE_URL}/videos/convert`, form, {
//       headers: form.getHeaders(),
//     });

//     console.log('Video conversion initiated:', response.data);
//     return response.data;
//   } catch (error) {
//     console.error('Error converting video:', error.message);
//     throw error;
//   }
// }

// Run the load test
loadTest();
