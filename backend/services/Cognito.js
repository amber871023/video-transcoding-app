import { CognitoIdentityProviderClient, SignUpCommand, AdminAddUserToGroupCommand, AdminConfirmSignUpCommand, InitiateAuthCommand, 
        GetUserCommand, AdminDeleteUserCommand, AdminGetUserCommand, ListUsersCommand, AdminDisableUserCommand   } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const client = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });

const clientId = '6qsb305b0v74lhuttbodun3men';
const userPoolId = 'ap-southeast-2_ikcu5JEvN';

export async function signUp(username, password, email) {
  console.log("Signing up user");
  try {
    const command = new SignUpCommand({
      ClientId: clientId,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    });
    const response = await client.send(command);
    return response;
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      return { error: "User already exists in Cognito" };
    } else {
      return { error: "Sign-up failed. Please try again later." };
    }
  }
}

// Function to group users
export async function groupUser(username, group) {
  try {
    const command = new AdminAddUserToGroupCommand({
      GroupName: group,
      Username: username,
      UserPoolId: userPoolId,
    });
    const response = await client.send(command);
    console.log('User added to the group:', response);
  } catch (err) {
    console.log('Error adding user to group:', err);
  }
}

// Get user data 
export async function getUserData( ){
    const command = new GetUserCommand({
        AccessToken: accessToken,
    });
    try{
        const response = await client.send(command);
        console.log("Authenticated user details: ", response);
        return response;
    }catch(err){
        console.error("Error getting user data from Cognito: ", err);
        throw err;
    }

}

// Get user Id baed on username
export async function getUserId(username){
    const command = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: username, 
    });
    try{
        const response = await client.send(command);
        // Extract User Sub from UserAttributes
        const userSubAttribute = response.UserAttributes.find(attr => attr.Name === 'sub');
        console.log("TEST",userSubAttribute.Value)
        if (userSubAttribute) {
            return userSubAttribute.Value; // Return the User Sub
        } else {
            console.error('User Sub not found for:', username);
            return null;} // Return null if User Sub not found
    }catch(err){
        if (err.name === 'UserNotFoundException') {
            console.error('User not found:', username);
            return null; // Return null if the user does not exist
        }
        console.error('Error fetching user ID:', err);
    }
}

// Delete specific user 
export async function deleteCognitoUser(name){
    const command = new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: name,
    })
    try{
        const response = await client.send(command)
        console.log("Cognito user deleted successfully: ", response);
        return response;
    }catch(err){
        console.error("Error deleting user: ", err);
    }
}

// Get user lists
export async function checkUserExist(username){
    const command = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: username,
    });
    try{
        await client.send(command);
        return true;
    }catch(err){
        if(err.name === 'UserNotFoundException'){
            // Return false when user is not found
            return false;
        }else{
            console.error('Error checking user existence:', error);
            throw err;
        }
    }
}


// Confirm user automatically (Currently unavailable)
// export async function confirmUser(username) {
//   try {
//     const command = new AdminConfirmSignUpCommand({
//       UserPoolId: userPoolId,
//       Username: username,
//     });
//     const response = await client.send(command);
//     console.log('User confirmed:', response);
//   } catch (err) {
//     console.error('Error confirming user:', err);
//   }
// }

// Function to authenticate user and generate tokens

// Get token after authentication
export async function getAuthTokens(username, password) {
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
      ClientId: clientId,
    });

    const response = await client.send(command);
    // Check if authentication result exists
    if (response.AuthenticationResult) {
      const { IdToken, AccessToken, RefreshToken } = response.AuthenticationResult;
      return { idToken: IdToken, accessToken: AccessToken, refreshToken: RefreshToken };
    } else {
      throw new Error("Authentication result is missing.");
    }
  } catch (error) {
    console.error("Error in getAuthTokens:", error);
    throw error;
  }
}

// Function to verify the JWT token
export async function verifyToken(token) {
  const idVerifier = CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "id",
    clientId: clientId,
  });

  try {
    // Verify the ID token
    const IdTokenVerifyResult = await idVerifier.verify(token);
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > IdTokenVerifyResult.exp) {
      throw new Error('Token has expired');
    }
    console.log(IdTokenVerifyResult);
    return IdTokenVerifyResult;
  } catch (err) {
    console.error('Error verifying token:', err);
    throw err;
  }
}

// Get all the users on Cognito
export async function getAllUsers(){
  const command = new ListUsersCommand({
    UserPoolId: userPoolId
  }) 
  try {
    const response = await client.send(command);
    const usernames = response.Users.map(user => user.Username);
    return usernames;
  }catch (error) {
    console.error('Error listing users:', error);
  }

}

// Disable specific user
export async function disableUser(username){
    const command = new AdminDisableUserCommand({
        UserPoolId: userPoolId, 
        Username: username,
    })
    try{
        const response = await client.send(command);
        console.log("Cognito user disabled successfully: ", response);
        return response;
    }catch (error) {
        console.error('Error disabling users:', error);
    }
}