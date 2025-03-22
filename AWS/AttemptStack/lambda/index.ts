import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();

export const handler = async (event: any) => {
    console.info('event', event);
    const bucketName = process.env.BUCKET_NAME;
    const key = process.env.KEY;

    try {
        const params = {
            Bucket: bucketName,
            Key: key
        };

        const data = await s3.getObject(params).promise();
        const jsonData = JSON.parse(data.Body.toString('utf-8'));

        // Mask the privateNumber
        for (const key in jsonData) {
            if (jsonData[key].privateNumber) {
                jsonData[key].privateNumber = jsonData[key].privateNumber.replace(/./g, '*');
            }
        }

        const res = JSON.stringify(jsonData);

        await s3.writeGetObjectResponse({
            RequestRoute: event.getObjectContext.outputRoute,
            RequestToken: event.getObjectContext.outputToken,
            Body: res,
            ContentType: 'application/json'
        }).promise()

        return { statusCode: 200, body: res};
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};