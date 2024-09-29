import pkg from '@aws-sdk/client-dynamodb';
const { DynamoDBClient } = pkg;
import DynamoDBLib from '@aws-sdk/lib-dynamodb';

import { getParameter } from '../services/Parameterstore.js';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'ap-southeast-2' });
const userTableName = "n11422807-users";

// Retrieve environment variables from AWS Parameter Store
const qutUsername = await getParameter('/n11422807/group50/QUT_USERNAME');
// const qutUsername = process.env.QUT_USERNAME;

// Function to create a user
export async function createUser({ email, username, passwordHash, userId }) {
  const command = new DynamoDBLib.PutCommand({
    TableName: userTableName,
    Item: {
      'qut-username': qutUsername,
      userId,
      username,
      passwordHash,
      email,
      createdAt: new Date().toISOString(),
    },
  });

  try {
    await client.send(command);
    return { userId, username, email }; // Return the new user data
  } catch (err) {
    console.error('Error creating user:', err);
    throw err;
  }
}

// Function to get a user by email
export async function getUserByEmail(email) {
  const command = new DynamoDBLib.QueryCommand({
    TableName: userTableName,
    KeyConditionExpression: '#pk = :username',
    ExpressionAttributeNames: {
      '#pk': 'qut-username'
    },
    ExpressionAttributeValues: {
      ':username': qutUsername,
      ':email': email
    },
    FilterExpression: 'email = :email',
  });

  try {
    const response = await client.send(command);
    return response.Items[0];
  } catch (err) {
    console.error('Error retrieving user:', err);
    throw err;
  }
}

