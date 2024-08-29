const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model
const { secretKey } = require('../middlewares/auth');

// Register new user
const registerUser = async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: true, msg: "Please enter all fields" });
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: true, msg: "Invalid email format" });
  }

  // Check password strength
  if (password.length < 6) {
    return res.status(400).json({ error: true, msg: "Password must be at least 6 characters long" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: true, msg: "User already exists" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newUser = new User({ email, username, passwordHash });
    await newUser.save();

    // Generate JWT token
    const expires_in = 60 * 60 * 24 * 30; // 30 days
    const exp = Math.floor(Date.now() / 1000) + expires_in;
    const token = jwt.sign({ id: newUser._id, email: newUser.email, username: newUser.username, exp }, secretKey);

    res.status(201).json({ error: false, msg: "User registered successfully", username, token });
  } catch (err) {
    res.status(500).json({ error: true, msg: "Server error", err: err.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: true, msg: "Missing email or password" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: true, msg: "User does not exist. Please register." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: true, msg: "Password incorrect" });
    }

    const expires_in = 60 * 60 * 24; // Token expiry time (24 hours)
    const exp = Math.floor(Date.now() / 1000) + expires_in;
    const token = jwt.sign({ id: user._id, email: user.email, username: user.username, exp }, secretKey);

    res.json({ token_type: "Bearer", token, expires_in, username: user.username });
  } catch (err) {
    res.status(500).json({ error: true, msg: "Server error", err });
  }
};

module.exports = { registerUser, loginUser };
