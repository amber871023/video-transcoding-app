const { verifyToken } = require('../services/Cognito');

// Use a fixed secret key (stored in environment variables)
const secretKey = process.env.JWT_SECRET || 'your-fixed-secret-key'; // Replace with a secure, fixed key

const authorize = async(req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
  } else {
    return res.status(403).send("Unauthorized");
  }
  try {
    // Verify the token
    const idTokenResult = await verifyToken(token);
    // Extract data from the token
    const userId = idTokenResult.sub;
    const email = idTokenResult.email;
    
    req.user = { id: userId, email: email }; // Attach user information to request
    next();
  } catch (err) {
    res.status(403).json({ error: true, msg: "Token is not valid", err });
  }
};

module.exports = { authorize, secretKey };
