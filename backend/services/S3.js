S3 = require("@aws-sdk/client-s3");
const bucketName = 'group50'
const qutUsername = 'n11404680@qut.edu.au'
const purpose = 'assessment-2'
const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });
const S3Presigner = require("@aws-sdk/s3-request-presigner");

// Create a bucket
exports.createBucket= async() =>{
    // Command for creating a bucket
    command = new S3.CreateBucketCommand({
        Bucket: bucketName
    });
    // Send the command to create the bucket 
    try {
        const response = await s3Client.send(command);
        console.log(response.Location);
    } catch (err) {
        console.log(err);
    }
}

// Tag the bucket
exports.tagBucket = async() => {

    command = new S3.PutBucketTaggingCommand({
        Bucket: bucketName,
        Tagging:{
            TagSet: [
                {
                    Key:'qut-username',
                    Value: qutUsername
                },
                {
                    Key:'purpose',
                    Value:purpose
                }
            ]
        }
    });

    // Send the command to tag the bucket
    try {
        const response = await s3Client.send(command);
        console.log("tag the bucket:" + {response})
    } catch (err) {
        console.log(err);
    } 

}

// Upload a file to S3
exports.putObject = async( key, value ) => {
    
    command = new S3.PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: value
    })
   
    try{
        const response = await s3Client.send(command);
        console.log(response);
    }catch(err){
        console.log(err)
    }
    
}

// Read the presigned URL from S3
exports.getURL = async(key) => {
    command = new S3.GetObjectCommand({
        Bucket: bucketName,
        Key: key
    })
    try{
        const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600} );
        return presignedURL;
    }catch(err){
        console.error('Error getting object from S3: ', err)
        throw err;
    }
}

// Read an object from S3
exports.getObject = async(key) => {
    command = new S3.GetObjectCommand({
        Bucket: bucketName,
        Key: key
    })
    try{
        const response = await s3Client.send(command);
        console.log("Get object successfully!")
        return response;
    }catch(err){
        console.error('Error getting object from S3: ', err)
        throw err;
    }
}

