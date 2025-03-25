import * as AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: any) => {
    console.info('event:', event);
    const tableName = process.env.TABLE_NAME;
    const userId = event.userId;

    try {
        if (!tableName || !userId) {
            throw new Error('Invalid parameters');
        }

        const data = await getUserInfo(ddb, tableName, userId);
        console.info('Get Data:', data);
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

const getUserInfo = async (client: AWS.DynamoDB.DocumentClient, tableName: string, userId: string) => {
    try {
        const params = {
            TableName: tableName,
            Key: { userId },
            ProjectionExpression: 'userId, wins'
        };

        const data = await client.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};