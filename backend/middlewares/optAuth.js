import { verifyToken } from '../services/Cognito.js';

// Define the middleware function as an export
export const optAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
    try {
      // Verify the token using Cognito
      const idTokenResult = await verifyToken(token);
      const email = idTokenResult.email;
      const userId = idTokenResult.sub;
      const username = idTokenResult.username;

      // Attach user information to the request if token is valid
      req.user = { id: userId, email: email, username: username };
    } catch (err) {
      console.log("User is not logged in");
    }
  }
  // Proceed without error even if the token is invalid or missing
  next();
};
