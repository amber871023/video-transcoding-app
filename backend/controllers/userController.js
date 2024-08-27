const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { secretKey } = require("../middleware/auth");

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
    const users = await req.db.from("users").select("*").where("email", "=", email);
    if (users.length > 0) {
      return res.status(400).json({ error: true, msg: "User already exists" });
    }
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const user = { email, username, hash };
    await req.db("users").insert(user);

    // Generate JWT token 
    const expires_in = 60 * 60 * 24; // Set expiry time
    const exp = Math.floor(Date.now() / 1000) + expires_in;
    const token = jwt.sign({ email: user.email, exp }, secretKey);

    res.status(201).json({ error: false, msg: "User registered successfully", username, token });
  } catch (err) {
    res.status(500).json({ error: true, msg: "Server error", err });
  }
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: true, msg: "Missing email or password" });
  }
  try {
    const users = await req.db.from("users").select("email", "hash").where("email", "=", email);
    if (users.length === 0) {
      return res.status(401).json({ error: true, msg: "User does not exist\n Please go to register" });
    }
    const user = users[0];
    const match = await bcrypt.compare(password, user.hash);
    if (!match) {
      return res.status(401).json({ error: true, msg: "Password incorrect" });
    }
    const expires_in = 60 * 60 * 24;
    const exp = Math.floor(Date.now() / 1000) + expires_in;
    const token = jwt.sign({ email: user.email, exp }, secretKey);

    res.json({ token_type: "Bearer", token, expires_in, username: user.username });
  } catch (err) {
    res.status(500).json({ error: true, msg: "Server error", err });
  }
};

module.exports = { registerUser, loginUser };
