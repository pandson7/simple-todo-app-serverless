import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = '102020250902';

    // DynamoDB Table
    const todosTable = new dynamodb.Table(this, `TodosTable-${suffix}`, {
      tableName: `todos-${suffix}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Functions
    const getTodosFunction = new lambda.Function(this, `GetTodosFunction-${suffix}`, {
      functionName: `getTodos-${suffix}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        exports.handler = async (event) => {
          try {
            const result = await docClient.send(new ScanCommand({
              TableName: process.env.TABLE_NAME
            }));
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              },
              body: JSON.stringify(result.Items || [])
            };
          } catch (error) {
            console.error('Error:', error);
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({ error: 'Internal server error' })
            };
          }
        };
      `),
      environment: {
        TABLE_NAME: todosTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    const createTodoFunction = new lambda.Function(this, `CreateTodoFunction-${suffix}`, {
      functionName: `createTodo-${suffix}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
        const { v4: uuidv4 } = require('uuid');

        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        exports.handler = async (event) => {
          try {
            const body = JSON.parse(event.body);
            const { description } = body;

            if (!description || description.trim() === '') {
              return {
                statusCode: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Description is required' })
              };
            }

            const todo = {
              id: uuidv4(),
              description: description.trim(),
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await docClient.send(new PutCommand({
              TableName: process.env.TABLE_NAME,
              Item: todo
            }));

            return {
              statusCode: 201,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              },
              body: JSON.stringify(todo)
            };
          } catch (error) {
            console.error('Error:', error);
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({ error: 'Internal server error' })
            };
          }
        };
      `),
      environment: {
        TABLE_NAME: todosTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    const updateTodoFunction = new lambda.Function(this, `UpdateTodoFunction-${suffix}`, {
      functionName: `updateTodo-${suffix}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        exports.handler = async (event) => {
          try {
            const { id } = event.pathParameters;
            const body = JSON.parse(event.body);
            const { status } = body;

            if (!status || !['pending', 'completed'].includes(status)) {
              return {
                statusCode: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Valid status is required (pending or completed)' })
              };
            }

            // Check if item exists
            const getResult = await docClient.send(new GetCommand({
              TableName: process.env.TABLE_NAME,
              Key: { id }
            }));

            if (!getResult.Item) {
              return {
                statusCode: 404,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Todo not found' })
              };
            }

            const result = await docClient.send(new UpdateCommand({
              TableName: process.env.TABLE_NAME,
              Key: { id },
              UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
              ExpressionAttributeNames: {
                '#status': 'status'
              },
              ExpressionAttributeValues: {
                ':status': status,
                ':updatedAt': new Date().toISOString()
              },
              ReturnValues: 'ALL_NEW'
            }));

            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              },
              body: JSON.stringify(result.Attributes)
            };
          } catch (error) {
            console.error('Error:', error);
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({ error: 'Internal server error' })
            };
          }
        };
      `),
      environment: {
        TABLE_NAME: todosTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    const deleteTodoFunction = new lambda.Function(this, `DeleteTodoFunction-${suffix}`, {
      functionName: `deleteTodo-${suffix}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        exports.handler = async (event) => {
          try {
            const { id } = event.pathParameters;

            // Check if item exists
            const getResult = await docClient.send(new GetCommand({
              TableName: process.env.TABLE_NAME,
              Key: { id }
            }));

            if (!getResult.Item) {
              return {
                statusCode: 404,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Todo not found' })
              };
            }

            await docClient.send(new DeleteCommand({
              TableName: process.env.TABLE_NAME,
              Key: { id }
            }));

            return {
              statusCode: 204,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              }
            };
          } catch (error) {
            console.error('Error:', error);
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({ error: 'Internal server error' })
            };
          }
        };
      `),
      environment: {
        TABLE_NAME: todosTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Grant permissions
    todosTable.grantReadData(getTodosFunction);
    todosTable.grantWriteData(createTodoFunction);
    todosTable.grantReadWriteData(updateTodoFunction);
    todosTable.grantReadWriteData(deleteTodoFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, `TodoApi-${suffix}`, {
      restApiName: `todo-api-${suffix}`,
      description: 'Simple TODO API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // API Resources and Methods
    const todosResource = api.root.addResource('todos');
    
    // GET /todos
    todosResource.addMethod('GET', new apigateway.LambdaIntegration(getTodosFunction));
    
    // POST /todos
    todosResource.addMethod('POST', new apigateway.LambdaIntegration(createTodoFunction));
    
    // Individual todo resource
    const todoResource = todosResource.addResource('{id}');
    
    // PUT /todos/{id}
    todoResource.addMethod('PUT', new apigateway.LambdaIntegration(updateTodoFunction));
    
    // DELETE /todos/{id}
    todoResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTodoFunction));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: todosTable.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}