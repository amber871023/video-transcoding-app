import bcrypt from 'bcrypt';
import { createUser, getUserByEmail } from '../models/User.js';
import { signUp, getAuthTokens, confirmUser, verifyToken, groupUser } from '../services/Cognito.js';

export const registerUser = async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: true, msg: "Please enter all fields" });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: true, msg: "User already exists" });
    }

    // Create user in Cognito
    const signUpResponse = await signUp(username, password, email);
    if (signUpResponse.error) {
      return res.status(400).json({ error: true, msg: signUpResponse.error });
    } else (console.log("Successfully registered user!"));

    let groupName;
    if (username.startsWith("admin")) {
      groupName = "admin";
    } else {
      groupName = "GeneralUsers"
    }
    groupUser(username, groupName);

    const userId = signUpResponse.UserSub;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    // // // Create use in DynamoDB
    const newUser = await createUser({ email, username, passwordHash, userId });

    res.status(201).json({ error: false, msg: "User registered successfully", username: username });
  } catch (err) {
    console.error('Error during user registration:', err.message);
    res.status(500).json({ error: true, msg: "Server error", err: err.message });
  }
};

export const loginUser = async (req, res) => {
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


    const username = user.username
    // Get token
    const response = await getAuthTokens(username, password);
    const idToken = response.idToken;

    // Decode the token
    const decodeToken = (token) => {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Replace URL-safe characters
      const decodedPayload = Buffer.from(base64, 'base64').toString('utf-8'); // Decode base64 to a string
      const payload = JSON.parse(decodedPayload);
      return payload;
    }
    const decodedToken = decodeToken(idToken)

    // Extract expiration time from decodedToken
    const expirationTime = decodedToken.exp;

    res.json({ token_type: "Bearer", idToken, expires_in: expirationTime, username: username });
  } catch (err) {
    res.status(500).json({ error: true, msg: "Server error", err: err.message });
  }
};

