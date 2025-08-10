import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";

const sns = new SNSClient();
const ddb = new DynamoDBClient();

interface CatData {
    catId: string;
    savedUrl: string;
}

export const handler = async (event: { body: string }): Promise<{ statusCode: number; body: string }> => {

    console.log(event);

    try {
        const { catId, savedUrl }: CatData = JSON.parse(event.body);

        if (!catId || !savedUrl) {
            throw new Error('Missing catId or savedUrl');
        }

        // Save to DynamoDB (single table design)
        await ddb.send(
            new PutItemCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    PK: { S: 'FAVORITE_CAT' },
                    SK: { S: 'CURRENT' },
                    catId: { S: catId},
                    savedUrl: {S: savedUrl},
                    timestamp: {S: new Date().toISOString()}
                }
            })
        );

        // Send SNS notification
        await sns.send(new PublishCommand({
            TopicArn: process.env.TOPIC_ARN!,
            Subject: 'New Favorite Cat!',
            Message: `New favorite cat saved!\nCat ID: ${catId}\nImage URL: ${savedUrl}`,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Cat saved successfully' }),
        };

    } catch (error) {

        console.error('Error saving cat:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error saving cat', error: (error as Error).message }),
        };

    }
};