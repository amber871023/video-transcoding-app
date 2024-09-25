const DynamoDB = require('@aws-sdk/client-dynamodb');
const DynamoDBLib = require('@aws-sdk/lib-dynamodb');
const qutUsername = process.env.QUT_USERNAME;
const videoTableName = "n11422807-videos";

const client = new DynamoDB.DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);

async function createVideo(video) {
  const command = new DynamoDBLib.PutCommand({
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
      createdAt: new Date().toISOString()
    }
  });

  try {
    await docClient.send(command);
    console.log('Video created successfully');
  } catch (err) {
    console.error('Error creating video:', err);
    throw err;
  }
}

// Get Video by ID
async function getVideoById(videoId) {
  const command = new DynamoDBLib.GetCommand({
    TableName: videoTableName,
    Key: {
      'qut-username': qutUsername,
      videoId: videoId
    }
  });

  try {
    const response = await docClient.send(command);
    return response.Item;
  } catch (err) {
    console.error('Error retrieving video:', err);
    throw err;
  }
}

// Get Videos by User ID
async function getVideosByUserId(userId) {
  const command = new DynamoDBLib.QueryCommand({
    TableName: videoTableName,
    KeyConditionExpression: '#qutUsername = :qutUsername',
    FilterExpression: '#userId = :userId',
    ExpressionAttributeNames: {
      '#qutUsername': 'qut-username', // Define partition key
      '#userId': 'userId', // Define filter key
    },
    ExpressionAttributeValues: {
      ':qutUsername': process.env.QUT_USERNAME,
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

// Update Video with Transcoded Path and Format
async function updateVideoTranscodedPath(videoId, transcodedPath, transcodedFormat) {
  const command = new DynamoDBLib.UpdateCommand({
    TableName: videoTableName,
    Key: {
      'qut-username': qutUsername,
      videoId: videoId
    },
    UpdateExpression: 'SET transcodedVideoPath = :transcodedPath, transcodedFormat = :transcodedFormat',
    ExpressionAttributeValues: {
      ':transcodedPath': transcodedPath,
      ':transcodedFormat': transcodedFormat,
    },
    ReturnValues: 'UPDATED_NEW'
  });

  try {
    const response = await docClient.send(command);
    console.log('Video updated with transcoded path and format:', response);
    return response.Attributes;
  } catch (err) {
    console.error('Error updating transcoded video path and format:', err);
    throw err;
  }
}


// Delete Video Record from DynamoDB
async function deleteVideoRecord(videoId) {
  const command = new DynamoDBLib.DeleteCommand({
    TableName: videoTableName,
    Key: {
      'qut-username': qutUsername,
      videoId: videoId
    }
  });

  try {
    const response = await docClient.send(command);
    console.log('Video record deleted successfully:', response);
  } catch (err) {
    console.error('Error deleting video record:', err);
    throw err;
  }
}

module.exports = {
  createVideo,
  getVideoById,
  getVideosByUserId,
  updateVideoTranscodedPath,
  deleteVideoRecord
};
