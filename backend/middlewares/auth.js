export const authorize = (req, res, next) => {
  if (req.requestContext.authorizer) {
    // Attach user information to the request from API Gateway context
    req.user = {
      id: req.requestContext.authorizer.userId,
      email: req.requestContext.authorizer.email,
      username: req.requestContext.authorizer.username,
      userGroup: req.requestContext.authorizer.userGroup,
    };
    next();
  } else {
    return res.status(403).json({ message: "Unauthorized" });
  }
};
