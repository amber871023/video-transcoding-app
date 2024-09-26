import pkg from '@aws-sdk/client-dynamodb'; // Import the package as a default import
const { DynamoDBClient, QueryCommand, PutCommand } = pkg; // Destructure the required commands from the package

const client = new DynamoDBClient({ region: 'ap-southeast-2' });
const userTableName = "n11422807-users";

// Function to create a user
export async function createUser({ email, username, passwordHash, userId }) {
  const command = new PutCommand({
    TableName: userTableName,
    Item: {
      'qut-username': process.env.QUT_USERNAME,
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
  const command = new QueryCommand({
    TableName: userTableName,
    KeyConditionExpression: '#pk = :username',
    ExpressionAttributeNames: {
      '#pk': 'qut-username',
    },
    ExpressionAttributeValues: {
      ':username': process.env.QUT_USERNAME,
      ':email': email,
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
