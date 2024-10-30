import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import createError from 'http-errors';
import { getParameter } from './services/Parameterstore.js';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middlewares
app.use(morgan('dev'));
app.use(cors({
  origin: 'http://localhost:3000', // Replace with your frontend URL
  //origin: 'http://group50-test.cab432.com:3000',
  credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import videoRoutes from './routes/videoRoutes.js';
app.use('/videos', videoRoutes);
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));
app.use('/transcoded_videos', express.static(path.join(path.resolve(), 'transcoded_videos')));


// Start server
(async () => {
  try {
    const PORT = await getParameter('/n11404680/group50/PORT') || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    app.timeout = 1200000; // Increase server timeout to 20 minutes
  } catch (err) {
    console.error('Failed to start server:', err);
  }
})();
// Add a /status route to check if the server is running
app.get('/status', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});
