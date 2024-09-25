const S3 = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Upload } = require('@aws-sdk/lib-storage'); // Import for better handling of stream uploads

// S3 configuration
const bucketName = 'group50';
const qutUsername = 'n11404680@qut.edu.au';
const purpose = 'assessment-2';
const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

// Function to create a bucket (if needed)
exports.createBucket = async () => {
    try {
        const response = await s3Client.createBucket({ Bucket: bucketName });
        console.log(response.Location);
    } catch (err) {
        console.log(err);
    }
};

exports.tagBucket = async () => {
    try {
        const response = await s3Client.putBucketTagging({
            Bucket: bucketName,
            Tagging: {
                TagSet: [
                    { Key: 'qut-username', Value: qutUsername },
                    { Key: 'purpose', Value: purpose }
                ]
            }
        });
        console.log("Bucket tagged:", response);
    } catch (err) {
        console.log(err);
    }
};

// Upload an object to S3 using the Upload class
exports.putObject = async (key, body) => {
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
};

// Function to generate a presigned URL for accessing an object
exports.getURL = async (key) => {
    try {
        const command = new S3.GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });
        const presignedURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return presignedURL;
    } catch (err) {
        console.error('Error getting object from S3:', err);
        throw err;
    }
};

// Function to retrieve an object from S3
exports.getObject = async (key) => {
    try {
        const command = new S3.GetObjectCommand({
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
};

// Read the presigned URL from S3
exports.getURLIncline = async (key) => {
    try {
        const command = new S3.GetObjectCommand({
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
};

// Delete an object from S3
exports.deleteObject = async (key) => {
    try {
        const command = new S3.DeleteObjectCommand({
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
};
