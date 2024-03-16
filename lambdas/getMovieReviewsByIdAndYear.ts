import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : null;
    const year = event.pathParameters?.year;

    if (!movieId || !year) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movieId or year" }),
      };
    }

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    let commandInput: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
      IndexName: "MovieIdReviewDateIndex",
      KeyConditionExpression: "movieId = :movieId and reviewDate between :yearStart and :yearEnd",
      ExpressionAttributeValues: {
        ":movieId": movieId,
        ":yearStart": yearStart,
        ":yearEnd": yearEnd,
      },
    };

    const reviewsCommandOutput = await ddbDocClient.send(new QueryCommand(commandInput));
  
    const body = {
      data: reviewsCommandOutput.Items,
    };

    // Return Response
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
};
