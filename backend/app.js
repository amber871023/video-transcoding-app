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
  origin: ['https://group50.cab432.com', 'http://localhost:3000',], // Allowed origins
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


app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://group50.cab432.com');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204); // Optional, you can also use res.send() if content is needed
});


// Routes
import userRoutes from './routes/userRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/uploads', express.static(path.join(path.resolve(), 'uploads')));
app.use('/api/transcoded_videos', express.static(path.join(path.resolve(), 'transcoded_videos')));

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

// Start server
(async () => {
  try {
    const PORT = await getParameter('/n11422807/group50/PORT') || 3001;
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
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
