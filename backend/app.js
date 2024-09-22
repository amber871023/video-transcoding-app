require('dotenv').config();
const express = require('express');
const DynamoDB = require('@aws-sdk/client-dynamodb');
const DynamoDBLib = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const createError = require('http-errors');

const app = express();
// Set up DynamoDB clients
const client = new DynamoDB.DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);
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
async function createTables() {
  await createUserTable();
  await createVideoTable();
}

createTables();


// Middlewares
app.use(morgan('dev'));
app.use(cors({
  origin: 'http://localhost:3000',// Replace with your frontend URL
  credentials: true,
  // origin: 'http://3.25.117.203:3000'
})); app.use(bodyParser.json());
app.use(express.json());

// Routes
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');
app.use('/users', userRoutes);
app.use("/videos", videoRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/transcoded_videos', express.static(path.join(__dirname, 'transcoded_videos')));

app.get('/', (req, res) => {
  res.send('Hello, world!');
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.timeout = 1200000; //Increase server timeout 20 minutes


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});


app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: res.locals.message,
    error: res.locals.error,
  });
});
