require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const createError = require('http-errors');
<<<<<<< HEAD
const { createBucket } = require('./services/S3');

const app = express();

const mongoDB = process.env.MONGODB_URI;
// MongoDB connection
mongoose.connect(mongoDB)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(`MongoDB connection err: ${err.message}`));

// Middlewares
app.use(morgan('dev'));
app.use(cors({
  origin: 'http://localhost:3000',// Replace with your frontend URL
  credentials: true,
  //origin: 'http://3.25.117.203:3000'
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
