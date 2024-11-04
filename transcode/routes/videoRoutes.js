import express from 'express';
import multer from 'multer';
import { optAuth as optionalAuthorize } from '../middlewares/optAuth.js';
import { convertVideo } from '../controllers/videoController.js';

// Setting up router and other utilities
const router = express.Router();
const upload = multer(); // Initialize multer with default settings


//router.post('/convert', optionalAuthorize, upload.none(), convertVideo);

export default router;
