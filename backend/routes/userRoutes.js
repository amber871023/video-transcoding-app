import express from 'express';
import { registerUser, loginUser, deleteUsers } from '../controllers/userController.js';
import { adminAuthorize } from '../middlewares/adminAuth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.delete('/delete/:username', adminAuthorize, deleteUsers);

export default router;
