# Assignment 1 - Web Server - Response to Criteria

## Instructions

- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections. If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3] are examples and should be removed

## Overview

- **Name:** Yi-Ting Cheng
- **Student number:** N11422807
- **Partner name:** Hsin-Yen Chiang
- **Partner Student number:** N11404680
- **Application name:** ViTranscoding
- **Two line description:** ViTranscoding is a web application that allows users to upload videos, transcode them into different formats, and download the converted videos. The application supports multiple video formats and provides live progress updates during the transcoding process.

- **EC2 instance name or ID:** i-0b56b40a55e94f30b

## Core criteria

### Core - First data persistence service

- **AWS service name:** S3
- **What data is being stored?:** Video files
- **Why is this service suited to this data?:** Large files are best suited to blob storage due to size restrictions on other services.
- **Why are the other services used not suitable for this data?:** Other services like DynamoDB and RDS are not optimized for storing large, unstructured files.
- **Bucket/instance/table name:** group50
- **Video timestamp:** 00:24, 01:08
- **Relevant files:**
  - /backend/services/S3.js
  - /backend/controllers/videoController.js

### Core - Second data persistence service

- **AWS service name:** DynamoDB
- **What data is being stored?:** User and video metadata
- **Why is this service suited to this data?:** DynamoDB provides fast and predictable performance with seamless scalability for key-value access patterns.
- **Why are the other services used not suitable for this data?:** S3 and RDS do not offer the same level of performance for real-time key-value lookups.
- **Bucket/instance/table name:** n11404680-users, n11404680-videos
- **Video timestamp:** 00:40, 01:48
- **Relevant files:**
  - /backend/services/DynamoDBService.js
  - /backend/models/User.js
  - /backend/models/Video.js
  - /backend/controllers/userController.js
  - /backend/controllers/videoController.js

### Third data service

- **AWS service name:**
- **What data is being stored?:**
- **Why is this service suited to this data?:**
- **Why are the other services used not suitable for this data?:** S
- **Bucket/instance/table name:**
- **Video timestamp:**

### S3 Pre-signed URLs

- **S3 Bucket names:** group50
- **Video timestamp:** 01:55
- **Relevant files:**
  - /backend/services/S3.js: 93
  - /backend/controllers/videoController.js: 31, 64, 174, 384

### In-memory cache

- **ElastiCache instance name:**
- **What data is being cached?:** [eg. Thumbnails from YouTube videos obatined from external API]
- **Why is this data likely to be accessed frequently?:** [ eg. Thumbnails from popular YouTube videos are likely to be shown to multiple users ]
- **Video timestamp:**
- **Relevant files:**

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Temporary files generated during video processing (uploading, transcoding, reformatting), such as video files and thumbnails, are stored in the /tmp directory of the server during processing.
- **Why is this data not considered persistent state?:** These temporary files can be recreated or reprocessed if lost. The final state, including the uploaded video, thumbnail, and transcoded video, is stored in S3, which provides long-term persistence. If the server is restarted, the temporary files are cleared, but the essential data remains in S3 and DynamoDB.
- **How does your application ensure data consistency if the app suddenly stops?:** Data is consistently uploaded to S3 and metadata is stored in DynamoDB. If a server crashes mid-processing, the system ensures that once the process resumes, it reuses or recreates the needed data.
- **Relevant files:**
  - /backend/controllers/videoController.js

### Graceful handling of persistent connections

- **Type of persistent connection and use:** Server-Sent Events (SSE) are used to provide real-time progress updates during video transcoding and reformatting. This allows the frontend to display progress to the user without requiring constant polling.
- **Method for handling lost connections:** When a connection is lost, the client automatically reconnects using exponential backoff. If reconnection is successful, the server resumes sending updates from the current state. If the backend is unavailable or an error occurs (e.g., network issue), the client displays error notifications via toast messages, informing the user of the connection issue. If reconnection fails after several attempts, users are notified with a toast message: "Maximum retry attempts reached. Please try again later."
- **Relevant files:**
  - /backend/controllers/videoController.js
  - /frontend/src/components/UploadSection.js: 54, 156
  - /frontend/src/pages/Videos.js: 68

### Core - Authentication with Cognito

- **User pool name:** group50-assignment2
- **How are authentication tokens handled by the client?:** Tokens are stored securely in local storage or cookies. They are passed in the authorization header of HTTP requests for secure API access.
- **Video timestamp:** 02:29
- **Relevant files:**
  - /backend/services/Cognito.js
  - /backend/middleware/auth.js
  - /backend/middleware/optAuth.js
  - /backend/controllers/userController.js

### Cognito multi-factor authentication

- **What factors are used for authentication:** [eg. password, SMS code]
- **Video timestamp:**
- ## **Relevant files:**

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- ## **Relevant files:**

### Cognito groups

- **How are groups used to set permissions?:** Cognito groups are used to define admin privileges, allowing users in the "admin" group to delete or disable users.
- **Video timestamp:** 02:32, 04:35
- **Relevant files:**
  - /backend/services/Cognito.js
  - /backend/controllers/userController.js
  - /frontend/src/pages/Admin.js

### Core - DNS with Route53

- **Subdomain**: group50-test.cab432.com
- **Video timestamp:** 05:30

### Custom security groups

- **Security group names:** group50
- **Services/instances using security groups:** EC2
- **Video timestamp:** 05:52
- **Relevant files:**

### Parameter store

- **Parameter names:** /n11404680/group50/PORT, /n11404680/group50/QUT_USERNAME
- **Video timestamp:** 06:30
- **Relevant files:**
  - /backend/app.js
  - /backend/services/Parameterstore.js
  - /backend/services/S3.js
  - /backend/models/User.js
  - /backend/models/Video.js

### Secrets manager

- **Secrets names:** n11404680-Cognito-Credentials
- **Video timestamp:** 06:51
- **Relevant files:**
  - /backend/services/Secretsmanager.js
  - /backend/services/Cognito.js

### Infrastructure as code

- **Technology used:**
- **Services deployed:**
- **Video timestamp:**
- ## **Relevant files:**

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- ## **Relevant files:**

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- ## **Relevant files:**
