import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getParameter } from '../services/Parameterstore.js'; // Ensure .js extension for ES Modules

// Retrieve environment variables from AWS Parameter Store
const qutUsername = await getParameter('/n11422807/group50/QUT_USERNAME');
const videoTableName = "n11422807-videos";

// Initialize DynamoDB client and document client
const client = new DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(client);

// Function to create a new video record
export async function createVideo(video) {
  const command = new PutCommand({
    TableName: videoTableName,
    Item: {
      'qut-username': qutUsername,
      videoId: video.videoId,
      title: video.title,
      originalVideoPath: video.originalVideoPath,
      transcodedVideoPath: video.transcodedVideoPath || null,
      format: video.format,
      size: video.size,
      duration: video.duration,
      thumbnailPath: video.thumbnailPath,
      s3Key: video.s3Key,
      userId: video.userId, // Store user ID if logged in, otherwise null
      createdAt: new Date().toISOString(),
    },
  });

  try {
    await docClient.send(command);
  } catch (err) {
    console.error('Error creating video:', err);
    throw err;
  }
}

// Function to get a video by its ID
export async function getVideoById(videoId) {
  const command = new GetCommand({
    TableName: videoTableName,
    Key: {
      'qut-username': qutUsername,
      videoId: videoId,
    },
  });

  try {
    const response = await docClient.send(command);
    return response.Item;
  } catch (err) {
    console.error('Error retrieving video:', err);
    throw err;
  }
}

// Function to get videos by User ID
export async function getVideosByUserId(userId) {
  const command = new QueryCommand({
    TableName: videoTableName,
    KeyConditionExpression: '#qutUsername = :qutUsername',
    FilterExpression: '#userId = :userId',
    ExpressionAttributeNames: {
      '#qutUsername': 'qut-username', // Define partition key
      '#userId': 'userId', // Define filter key
    },
    ExpressionAttributeValues: {
      ':qutUsername': qutUsername,
      ':userId': userId,
    },
  });

  try {
    const response = await docClient.send(command);
    return response.Items; // Return the list of videos
  } catch (err) {
    console.error('Error retrieving videos for user:', err);
    throw err;
  }
}

// Function to update video with transcoded path and format
export async function updateVideoTranscodedPath(videoId, transcodedPath, transcodedFormat) {
  const command = new UpdateCommand({
    TableName: videoTableName,
    Key: {
      'qut-username': qutUsername,
      videoId: videoId,
    },
    UpdateExpression: 'SET transcodedVideoPath = :transcodedPath, transcodedFormat = :transcodedFormat',
    ExpressionAttributeValues: {
      ':transcodedPath': transcodedPath,
      ':transcodedFormat': transcodedFormat,
    },
    ReturnValues: 'UPDATED_NEW',
  });

  try {
    const response = await docClient.send(command);
    return response.Attributes;
  } catch (err) {
    console.error('Error updating transcoded video path and format:', err);
    throw err;
  }
}

// Function to delete a video record from DynamoDB
export async function deleteVideoRecord(videoId) {
  const command = new DeleteCommand({
    TableName: videoTableName,
    Key: {
      'qut-username': qutUsername,
      videoId: videoId,
    },
  });

  try {
    await docClient.send(command);
  } catch (err) {
    console.error('Error deleting video record:', err);
    throw err;
  }
}
