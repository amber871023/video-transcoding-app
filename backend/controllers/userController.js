import bcrypt from 'bcrypt';
import { createUser, getUserByEmail, deleteUser} from '../models/User.js';
import { signUp, getAuthTokens, groupUser, deleteCognitoUser, checkUserExist, getUserId, getAllUsers, disableUser  } from '../services/Cognito.js';
import jwt from 'jsonwebtoken';


export const registerUser = async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: true, msg: "Please enter all fields" });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: true, msg: "User already exists in DynamoDB" });
    }

    // Create user in Cognito
    const signUpResponse = await signUp(username, password, email);
    if (signUpResponse.error) {
      return res.status(400).json({ error: true, msg: signUpResponse.error });
    } else (console.log("Successfully registered user!"));

    let groupName;
    if (username.startsWith("admin")) {
      groupName = "admin";
    } else {
      groupName = "GeneralUsers"
    }
    groupUser(username, groupName);

    const userId = signUpResponse.UserSub;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    // // // Create use in DynamoDB
    const newUser = await createUser({ email, username, passwordHash, userId });

    res.status(201).json({ error: false, msg: "User registered successfully", username: username });
  } catch (err) {
    console.error('Error during user registration:', err.message);
    res.status(500).json({ error: true, msg: "Server error", err: err.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: true, msg: "Missing email or password" });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: true, msg: "User does not exist. Please register." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: true, msg: "Password incorrect" });
    }


    const username = user.username
    // Get token
    const response = await getAuthTokens(username, password);
    const idToken = await response.idToken;
    const accessToken = await response.accessToken;


    const decodedToken = jwt.decode(idToken);
    
    // Extract the user's group(s)
    const userGroup = decodedToken['cognito:groups'][0];

    // Extract expiration time from decodedToken
    const expirationTime = decodedToken.exp;

    // Get user group from Cognito
    // const userData = await getUserGroup(username);

    res.json({ token_type: "Bearer", idToken, expires_in: expirationTime, username, userGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, msg: "Server error", err: err.message });
  }
};
export const deleteUsers = async (req, res) =>{
  const username  = req.params.username;
  const userId = await getUserId(username);
  console.log("HERE",userId);
  try{
    const result = await checkUserExist(username);
    console.log(result);
    if(result == true){
      // Delete user from Cognito
      const response = await deleteCognitoUser(username);
      // Delete user from DynamoDB
      const response2 = await deleteUser(userId);
      res.json({ message: `${username} has been delete successfully!` });
    }else{
      res.status(404).json({ error: true, message: 'User not found' });    }
  }catch(err){
    res.status(500).json({ error: true, message: "Error deleting user: ", err: err.message });
  }

};

export const getUserList = async(req, res) =>{
  try {
    // Cognito function to get all users' usernames
    const users = await getAllUsers(); 
    // Send all users as a response
    res.status(200).json(users); 
  } catch (error) {
    console.error('Error retrieving user list:', error); // Log the error
    res.status(500).json({ message: 'Failed to retrieve users' }); // Send an error response
  }
};

export const disableUsers = async(req, res) =>{
  const username  = req.params.username;
  try{
    const result = await checkUserExist(username);
    console.log(result);
    if(result == true){
      // Disable user from Cognito
      const response = await disableUser(username);
      res.json({ message: `${username} has been diabled successfully!` });
    }else{
      res.status(404).json({ error: true, message: 'User not found' });    }
  }catch(err){
    res.status(500).json({ error: true, message: "Error disabling user: ", err: err.message });
  }
}