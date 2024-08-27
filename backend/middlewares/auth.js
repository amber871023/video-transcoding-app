const jwt = require("jsonwebtoken");
const crypto = require('crypto');

// Middleware to authorize user

// generate or retrieve a fixed secret key
const secretKey = crypto.randomBytes(32).toString('hex');

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
    req.email = decoded.email;
    next();
  } catch (err) {
    res.status(403).json({ error: true, msg: "Token is not valid", err });
  }
};

module.exports = { authorize, secretKey };
