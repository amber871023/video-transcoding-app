import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

// Initialize the DynamoDB client
const client = new DynamoDBClient({ region: 'ap-southeast-2' });
console.log('DynamoDB configured successfully');

// Function to check if a table exists
async function tableExists(tableName) {
  try {
    const data = await client.send(new ListTablesCommand({}));
    return data.TableNames.includes(tableName);
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
}

// Function to create the User table
async function createUserTable() {
  const tableName = "n11422807-users";
  if (await tableExists(tableName)) {
    console.log(`Table ${tableName} already exists.`);
    return;
  }

  const command = new CreateTableCommand({
    TableName: tableName,
    AttributeDefinitions: [
      { AttributeName: 'qut-username', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'qut-username', KeyType: 'HASH' },
      { AttributeName: 'userId', KeyType: 'RANGE' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  try {
    const response = await client.send(command);
    console.log(`Create User Table command response:`, response);
  } catch (error) {
    console.error('Error creating User table:', error);
  }
}

// Function to create the Video table
async function createVideoTable() {
  const tableName = "n11422807-videos";
  if (await tableExists(tableName)) {
    console.log(`Table ${tableName} already exists.`);
    return;
  }

  const command = new CreateTableCommand({
    TableName: tableName,
    AttributeDefinitions: [
      { AttributeName: 'qut-username', AttributeType: 'S' },
      { AttributeName: 'videoId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'qut-username', KeyType: 'HASH' },
      { AttributeName: 'videoId', KeyType: 'RANGE' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  try {
    const response = await client.send(command);
    console.log(`Create Video Table command response:`, response);
  } catch (error) {
    console.error('Error creating Video table:', error);
  }
}

// Main function to create both tables
export async function createTables() {
  await createUserTable();
  await createVideoTable();
}

// Run the script manually if needed
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => console.log('Tables setup completed'))
    .catch(console.error);
}