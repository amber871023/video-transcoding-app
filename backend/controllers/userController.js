const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { secretKey } = require('../middlewares/auth');
const { createUser, getUserByEmail } = require('../models/User');

const registerUser = async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: true, msg: "Please enter all fields" });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: true, msg: "User already exists" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await createUser({ email, username, passwordHash });

    const token = jwt.sign({ id: newUser.userId, username: newUser.username, email: newUser.email }, secretKey, { expiresIn: '30d' });

    res.status(201).json({ error: false, msg: "User registered successfully", username: newUser.username, token });
  } catch (err) {
    console.error('Error during user registration:', err.message);
    res.status(500).json({ error: true, msg: "Server error", err: err.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: true, msg: "Missing email or password" });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: true, msg: "User does not exist. Please register." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: true, msg: "Password incorrect" });
    }

    const token = jwt.sign({ id: user.userId, username: user.username, email: user.email }, secretKey, { expiresIn: '24h' });

    res.json({ token_type: "Bearer", token, expires_in: 86400, username: user.username });
  } catch (err) {
    res.status(500).json({ error: true, msg: "Server error", err: err.message });
  }
};

module.exports = { registerUser, loginUser };
