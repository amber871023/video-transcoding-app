const jwt = require("jsonwebtoken");

// Use a fixed secret key (stored in environment variables)
const secretKey = process.env.JWT_SECRET || 'your-fixed-secret-key'; // Replace with a secure, fixed key

const authorize = (req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
  } else {
    return res.status(403).send("Unauthorized");
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(403).send("Token has expired");
    }
    req.user = { id: decoded.id, email: decoded.email }; // Attach user information to request
    next();
  } catch (err) {
    res.status(403).json({ error: true, msg: "Token is not valid", err });
  }
};

module.exports = { authorize, secretKey };
