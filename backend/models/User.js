const DynamoDB = require('@aws-sdk/client-dynamodb');
const DynamoDBLib = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid'); // Import the UUID package
const { signUp } = require('../services/Cognito');

const qutUsername = process.env.QUT_USERNAME;
const userTableName = "n11422807-users";

const client = new DynamoDB.DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);

async function createUser({ email, username, passwordHash, userId }) {

  const command = new DynamoDBLib.PutCommand({
    TableName: userTableName,
    Item: {
      'qut-username': qutUsername,
      userId,
      username,
      passwordHash,
      email,
      createdAt: new Date().toISOString()
    }
  });
  try {
    await docClient.send(command);
    return { userId, username, email }; // Return the new user data
  } catch (err) {
    console.error('Error creating user:', err);
    throw err;
  }
}

// Function to get a user by email
async function getUserByEmail(email) {
  const command = new DynamoDBLib.QueryCommand({
    TableName: userTableName,
    KeyConditionExpression: '#pk = :username',
    ExpressionAttributeNames: {
      '#pk': 'qut-username'
    },
    ExpressionAttributeValues: {
      ':username': process.env.QUT_USERNAME,
      ':email': email
    },
    FilterExpression: 'email = :email',
  });

  try {
    const response = await docClient.send(command);
    return response.Items[0];
  } catch (err) {
    console.error('Error retrieving user:', err);
    throw err;
  }
}

module.exports = { createUser, getUserByEmail };
