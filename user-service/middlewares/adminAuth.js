import jwt from 'jsonwebtoken';

export const adminAuthorize = async (req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
  } else {
    return res.status(403).send("Unauthorized");
  }

  try {

    const decodedToken = jwt.decode(token);
    const userGroup = decodedToken['cognito:groups'][0];
    if(userGroup === 'admin'){
        req.user = {
            group: userGroup,
        }
        next();
    }else{
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

  } catch (err) {
    res.status(403).json({ error: true, msg: "Token is not valid", err });
  }
};
