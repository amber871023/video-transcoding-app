import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { convertVideo } from '../controllers/videoController.js';

const sqsQueueUrl = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/group50-queue";
const client = new SQSClient({
  region: "ap-southeast-2",
});

export async function pollSQS(){
    const command = new ReceiveMessageCommand({
        MaxNumberOfMessages: 10,
        QueueUrl: sqsQueueUrl,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 120, // temporarily invisible to other consumers, duration in seconds
    }) 
    while(true){
        try{
            const response = await client.send(command);
            console.log("Receiving a message: ", response);
            // Process body if there are messages in the queue
            if(response.Messages){
                let message = response.Messages[0];
                // retrieve data from the body 
                const videoDetails = JSON.parse(message.Body);   
                const url = videoDetails.url;
                const id = videoDetails.id;
                const format = videoDetails.format;
                await convertVideo(url, id, format);
                
                // Delete the message from the queue after conversion
                const deleteCommand = new DeleteMessageCommand({
                    QueueUrl: sqsQueueUrl,
                    ReceiptHandle: message.ReceiptHandle,
                })
                const deleteResponse = await client.send(deleteCommand);
                console.log("Deleting the message: ", deleteResponse)
    
            }else {
                // If no messages, wait a bit before polling again
                console.log("No messages in the queue. Polling again in 6 seconds...");
                const waitTime = 6000;
                await new Promise(resolve => setTimeout(resolve, waitTime))
            }
    
        }catch(err){
            console.error("Error when receiving message from SQS: ",err);
        }
        
    }
    
    

}

