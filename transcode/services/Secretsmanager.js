import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: "ap-southeast-2",
});

export async function getSecretValue(secretName) {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
      })
    );

    // Check if the response contains a secret string
    if ("SecretString" in response) {
      return JSON.parse(response.SecretString);
    } else {
      throw new Error("SecretString not found in response.");
    }
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    throw error;
  }
}

