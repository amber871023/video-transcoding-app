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

// Proper CORS Configuration with Proxy Handling
const corsOptions = {
  origin: ['https://group50.cab432.com', 'http://localhost:3000'], // Allowed origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Allowed methods
  credentials: true, // Allow sending cookies
  allowedHeaders: 'Content-Type, Authorization', // Allowed headers
  exposedHeaders: 'Content-Length, X-Requested-With', // Optionally expose headers
};

// Handle Preflight (OPTIONS) Requests for CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Allow OPTIONS for all routes
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import userRoutes from './routes/userRoutes.js';
app.use('/api/users', userRoutes);

// Start server
(async () => {
  try {
    const PORT = await getParameter('/n11422807/group50/PORT') || 4000;
    app.listen(4000, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
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
