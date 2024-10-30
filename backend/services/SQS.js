import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsQueueUrl = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/group50-queue";
const client = new SQSClient({
  region: "ap-southeast-2",
});

export async function notifyConversion(videoUrl, videoId, covertFormat){
  const message = JSON.stringify({ 
    videoUrl, 
    videoId,
    covertFormat
    
});
  const command = new SendMessageCommand({
    QueueUrl: sqsQueueUrl,
    DelaySeconds:10,
    MessageBody: message,
  });

  try {
    const response = await client.send(command);
    console.log("Message sent to SQS:", response);
  } catch (error) {
    console.error("Error sending message to SQS:", error);
  }

};