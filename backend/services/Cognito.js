import { CognitoIdentityProviderClient, SignUpCommand, AdminAddUserToGroupCommand, AdminConfirmSignUpCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
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
      return { error: "User already exists" };
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

// Function to confirm user automatically
export async function confirmUser(username) {
  try {
    const command = new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: username,
    });
    const response = await client.send(command);
    console.log('User confirmed:', response);
  } catch (err) {
    console.error('Error confirming user:', err);
  }
}

// Function to authenticate user and generate tokens
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
