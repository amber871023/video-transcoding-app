//This middleware allows unauthenticated access but will attach user information to the request if a valid JWT token is provided.
//Mainly use for user who don't want to register 


const optAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
    try {
      // Verify the token
      const idTokenResult = await verifyToken(token);
      const email = idTokenResult.email;
      const id =  idTokenResult.sub;
      const username = idTokenResult.username;

      req.user = { id: id, email: email, username: username };
    } catch (err) {
      console.log("Token is not valid:", err.message);
    }
  }
  next(); // Proceed without error even if the token is invalid or missing
};

module.exports = optAuth;
