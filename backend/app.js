require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

const app = express();

const mongoDB = process.env.MONGODB_URI;

// MongoDB connection
mongoose.connect(mongoDB)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(`MongoDB connection err: ${err.message}`));

// Middlewares
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.json());

// Routes
//app.get('/', (req, res) => res.send('Video Transcoding API is running...'));
const userRouter = require('./routes/userRouter');
const videoRouter = require('./routes/videoRouter');
app.use('/users', userRouter);
app.use("/videos", videoRouter);



// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
