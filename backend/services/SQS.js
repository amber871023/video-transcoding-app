import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsQueueUrl = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/group50-queue";
const client = new SQSClient({
  region: "ap-southeast-2",
});

export async function notifyConversion(videoUrl, videoId, covertFormat){
  const message = JSON.stringify({ 
    url:videoUrl, 
    id: videoId,
    format: covertFormat, 
    
});
  const command = new SendMessageCommand({
    QueueUrl: sqsQueueUrl,
    DelaySeconds:10,
    MessageBody: message,
  });

  const response = await client.send(command);
  console.log('Sent message to SQS: ', response);

};