# Assignment 1 - Web Server - Response to Criteria

## Overview

- **Name:** Yi-Ting Cheng
- **Student number:** N11422807
- **Application name:** ViTranscoding
- **Two line description:** ViTranscoding is a web application that allows users to upload videos, transcode them into different formats, and download the converted videos. The application supports multiple video formats and provides live progress updates during the transcoding process.

## Core criteria

### Docker image

- **ECR Repository name:** n11422807a1
- **Video timestamp:** 0:16
- **Relevant files:**
  - `/backend/Dockerfile`
  - `/frontend/Dockerfile`

### Docker image running on EC2

- **EC2 instance ID:** i-050b736394cdb7992
- **Video timestamp:** 0:45

### User login functionality

- **One line description:** Implements user authentication using JWT tokens, allowing users to log in.
- **Video timestamp:** 1:25
- **Relevant files:**
  - `/backend/middlewares/auth.js`
  - `/backend/controllers/userController.js`
  - `/backend/models/User.js`

### User dependent functionality

- **One line description:** Users can view, reformat, and download their own video files from their upload history. The application enforces ownership using JWT tokens.
- **Video timestamp:** 1:42
- **Relevant files:**
  - `/backend/routes/videos.js`
  - `/backend/controllers/videoController.js`

### Web client

- **One line description:** The web client is a single-page application built with React, providing a user-friendly interface for video upload, transcoding, and downloading.
- **Video timestamp:** 1:02
- **Relevant files:**
  - `/frontend/`

### REST API

- **One line description:** RESTful API providing endpoints for user authentication, video upload, converting, reformat, download and delet, using appropriate HTTP methods and status codes.
- **Video timestamp:** 3:25
- **Relevant files:**
  - `/backend/routes/userRoutes.js`
  - `/backend/controllers/userController.js`
  - `/backend/routes/videoRoutes.js`
  - `/backend/controllers/videoController.js`

### Two kinds of data

#### First kind

- **One line description:** Video files uploaded by users for transcoding.
- **Type:** Unstructured
- **Rationale:** Videos are too large for database. No need for additional functionality.
- **Video timestamp:** 3:35
- **Relevant files:**
  - `/backend/uploads`
  - `/backend/routes/Video.js`
  - `/backend/controllers/videoController.js`
  - `/backend/transcoded_videos/`

#### Second kind

- **One line description:** File metadata, user ownership of videos
- **Type:** Structured data stored in a MongoDB database.
- **Rationale:** Need to be able to query for user and video data. Low chance of multiple writes to single file or user data.
- **Video timestamp:** 3:47
- **Relevant files:**
  - `/backend/models/Video.js`
  - `/backend/routes/Video.js`
  - `/backend/controllers/videoController.js`

### CPU intensive task

- **One line description:** Upload and transcoding video files to different formats using `ffmpeg`.
- **Video timestamp:** 3:57
- **Relevant files:**
  - `/backend/routes/Video.js`
  - `/backend/controllers/videoController.js`

### CPU load testing method

- **One line description:** A Node.js script that generates multiple concurrent requests to the transcoding endpoint, simulating high CPU load.
- **Video timestamp:** 4:16
- **Relevant files:**
  - `/test/loadTest.js`

## Additional criteria

### Extensive REST API features

- **One line description:** Not attempted
- **Video timestamp:** mm:ss
- ## **Relevant files:**

### Use of external API(s)

- **One line description:** Not attempted
- **Video timestamp:** mm:ss

### Extensive web client features

- **One line description:** The web client includes features like video preview, drag-and-drop video upload, real-time transcoding progress updates and video player. Single page application.
- **Video timestamp:** 1:50
- **Relevant files:**
  - `/frontend/src/pages/Home.js`
  - `/frontend/src/components/UploadSection.js`
  - `/frontend/src/pages/Videos.js`

### Sophisticated data visualisations

- **One line description:** Not attempted
- **Video timestamp:** mm:ss

### Additional kinds of data

- **One line description:** Not attempted
- **Video timestamp:** mm:ss

### Significant custom processing

- **One line description:** Not attempted
- **Video timestamp:** mm:ss

### Live progress indication

- **One line description:** The web client periodically polls the server for convering/reformating progress, displaying a live progress bar/circle progress to the user.
- **Video timestamp:** 2:52
- **Relevant files:**
  - `/backend/routes/Video.js`
  - `/backend/controllers/videoController.js`
    - `/frontend/src/components/UploadSection.js`
  - `/frontend/src/pages/Videos.js`

### Infrastructure as code

- **One line description:** The application deployment is managed using Docker Compose, which orchestrates both the application(frontend and backend) and MongoDB containers.
- **Video timestamp:** 0:32
- **Relevant files:**
  - `/docker-compose.yml`

### Other:Docker Buildx Usage

- **One line description:** Docker Buildx is used to build multi-architecture Docker images, enabling compatibility with both ARM64 and x86_64 architectures.
- **Video timestamp:** 0:18
