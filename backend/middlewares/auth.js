import { verifyToken } from '../services/Cognito.js';

export const authorize = async (req, res, next) => {
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

    // Attach user information to request
    req.user = { id: userId, email: email };
    next();
  } catch (err) {
    res.status(403).json({ error: true, msg: "Token is not valid", err });
  }
};
