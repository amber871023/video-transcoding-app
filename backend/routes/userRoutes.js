import express from 'express';
import { registerUser, loginUser, deleteUsers, getUserList, disableUsers } from '../controllers/userController.js';
import { adminAuthorize } from '../middlewares/adminAuth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.delete('/delete/:username', adminAuthorize, deleteUsers);
router.get('/getlist', adminAuthorize, getUserList);
router.post('/disable/:username', adminAuthorize, disableUsers);
export default router;
