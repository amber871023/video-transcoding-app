import { S3Client, CreateBucketCommand, PutBucketTaggingCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from '@aws-sdk/lib-storage';

// S3 configuration
const bucketName = 'group50';
const qutUsername = 'n11404680@qut.edu.au';
const purpose = 'assessment-2';
const s3Client = new S3Client({ region: 'ap-southeast-2' });

// Function to create a bucket (if needed)
export async function createBucket() {
    try {
        const command = new CreateBucketCommand({ Bucket: bucketName });
        const response = await s3Client.send(command);
        console.log(response.Location);
    } catch (err) {
        console.log(err);
    }
}

// Function to tag a bucket
export async function tagBucket() {
    try {
        const command = new PutBucketTaggingCommand({
            Bucket: bucketName,
            Tagging: {
                TagSet: [
                    { Key: 'qut-username', Value: qutUsername },
                    { Key: 'purpose', Value: purpose }
                ]
            }
        });
        const response = await s3Client.send(command);
        console.log("Bucket tagged:", response);
    } catch (err) {
        console.log(err);
    }
}

// Upload an object to S3 using the Upload class
export async function putObject(key, body) {
    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: key,
                Body: body,
            },
        });
        upload.on('httpUploadProgress', (progress) => {
            console.log(`Uploaded ${progress.loaded} of ${progress.total} bytes`);
        });
        await upload.done();
        console.log('Upload completed successfully');
    } catch (err) {
        console.error('Error uploading to S3:', err);
        throw err;
    }
}

// Function to generate a presigned URL for accessing an object
export async function getURL(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });
        const presignedURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return presignedURL;
    } catch (err) {
        console.error('Error getting object from S3:', err);
        throw err;
    }
}

// Function to retrieve an object from S3
export async function getObject(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });
        const response = await s3Client.send(command);
        console.log("Get object successfully!");
        return response;
    } catch (err) {
        console.error('Error getting object from S3:', err);
        throw err;
    }
}

// Read the presigned URL from S3
export async function getURLIncline(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
            ResponseContentDisposition: 'inline'
        });
        const presignedURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return presignedURL;
    } catch (err) {
        console.error('Error getting object from S3: ', err);
        throw err;
    }
}

// Delete an object from S3
export async function deleteObject(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key
        });
        const response = await s3Client.send(command);
        console.log(response);
        return response;
    } catch (err) {
        console.log("Error deleting object: ", err);
        throw err;
    }
}
