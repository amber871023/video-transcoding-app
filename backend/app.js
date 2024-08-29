require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

const mongoDB = process.env.MONGODB_URI;

// MongoDB connection
mongoose.connect(mongoDB)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(`MongoDB connection err: ${err.message}`));

// Middlewares
app.use(morgan('dev'));
app.use(cors({
  origin: 'http://localhost:3001' // Replace with your frontend URL
})); app.use(bodyParser.json());
app.use(express.json());

// Routes
//app.get('/', (req, res) => res.send('Video Transcoding API is running...'));
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');
app.use('/users', userRoutes);
app.use("/videos", videoRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Start server
const PORT = process.env.PORT || 3000;
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
