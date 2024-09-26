const Cognito = require('@aws-sdk/client-cognito-identity-provider');
const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
const jwt = require("aws-jwt-verify");

const clientId = '6qsb305b0v74lhuttbodun3men';
const userPoolId = 'ap-southeast-2_ikcu5JEvN';

// Sign up users
exports.signUp = async( username, password, email ) =>{
    console.log("Signing up user");
    try{
        command = new Cognito.SignUpCommand({
            ClientId: clientId,
            userPoolId: userPoolId,
            Username: username,
            Password: password, 
            MessageAction: 'SUPPRESS',
            UserAttributes: [{ Name: "email", Value: email }],
        }) 
        const response = await client.send(command);
        console.log("Sign up successfully: ", response);
        return response;
    }catch(err){
        if (err.name === 'UsernameExistsException'){
        // Handle case where user already exists
        console.log("User already exists:", err);
        return { error: "User already exists" };
        }
        else{
        // Handle other errors
        console.log("Sign-up error: ", err);
        return { error: "Sign-up failed. Please try again later." };
    }
  }
}

// Group users
exports.groupUser = async(username, group) => {
    try{
        command = {
            GroupName: group,
            Username: username,
            UserPoolId: userPoolId
        };
        const groupCommand = new Cognito.AdminAddUserToGroupCommand(command);
        const response = await client.send(groupCommand);
        console.log('User added to the group: ', response);
    }catch(err){
        console.log('Error adding user to group: ', err);
    }
}

// Confirm user automatically
exports.confirmUser = async(username) =>{
    try{
        command = new Cognito.AdminConfirmSignUpCommand({
            UserPoolId: userPoolId,
            Username: username,
        });
        res = await client.send(command);
        console.log("User confirmed: ", res);
    }catch(err){
        console.error(err);
    }
}

// Authenticate user and generate token
exports.getAuthTokens = async(username, password) =>{
    try {
        command = new Cognito.InitiateAuthCommand({
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

exports.verifyToken = async(token)=>{
    // JWT for verifying ID 
    const idVerifier = jwt.CognitoJwtVerifier.create({
        userPoolId: userPoolId,
        tokenUse: "id",
        clientId: clientId,
    });

    // Verify the ID token
    /*Attributes include: sub, email_verified, iss, client_id, origin_jti, aud, evnt_id, token_use, scope
    exp, username, jti, auth_time, email*/
    const IdTokenVerifyResult = await idVerifier.verify(token);
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > IdTokenVerifyResult.exp) {
      throw new Error('Token has expired');
    }
    console.log(IdTokenVerifyResult);
    return IdTokenVerifyResult;

}   