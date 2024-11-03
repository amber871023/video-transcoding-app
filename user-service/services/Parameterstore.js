import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize SSM client with the appropriate region
const ssmClient = new SSMClient({ region: 'ap-southeast-2' });

// Function to fetch a parameter from AWS Systems Manager Parameter Store
export async function getParameter(name) {
  const params = {
    Name: name,
    WithDecryption: true,
  };

  try {
    // Create the GetParameter command and send the request
    const command = new GetParameterCommand(params);
    const data = await ssmClient.send(command);
    return data.Parameter.Value;
  } catch (err) {
    console.error('Error fetching parameter:', err);
    throw err;
  }
}
