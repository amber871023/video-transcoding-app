export const optAuth = (req, res, next) => {
  if (req.requestContext && req.requestContext.authorizer) {
    // Attach user information to the request from API Gateway context
    req.user = {
      id: req.requestContext.authorizer.userId,
      email: req.requestContext.authorizer.email,
      username: req.requestContext.authorizer.username,
      userGroup: req.requestContext.authorizer.userGroup,
    };
  } else {
    // If running locally or without authorizer, you can set req.user as null or handle as guest
    req.user = null;
  }
  next();
};
