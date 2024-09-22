const jwt = require("jsonwebtoken");
//This middleware allows unauthenticated access but will attach user information to the request if a valid JWT token is provided.
//Mainly use for user who don't want to register 

const secretKey = process.env.JWT_SECRET || 'your-fixed-secret-key'; // Replace with a secure, fixed key

const optAuth = (req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, secretKey);
      if (decoded.exp >= Math.floor(Date.now() / 1000)) {
        req.user = { id: decoded.id, email: decoded.email, username: decoded.username };
      }
    } catch (err) {
      console.log("Token is not valid:", err.message);
    }
  }
  next(); // Proceed without error even if the token is invalid or missing
};

module.exports = optAuth;
