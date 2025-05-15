import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs'
import { 
  aws_apigateway,
  aws_dynamodb,
  aws_iam,
  RemovalPolicy,
  aws_lambda,
  aws_lambda_nodejs
 } from 'aws-cdk-lib';

const PREFIX = 'Attempt';

export class AttemptStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userTable = new aws_dynamodb.Table(this, `${PREFIX}-UserTable`,{
      tableName: `${PREFIX}-UserTable`,
      partitionKey: {name: 'userId', type: aws_dynamodb.AttributeType.STRING},
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const apiGatewayExecRole = new aws_iam.Role(this, `${PREFIX}-ApiGateway-Role`, {
      roleName: `${PREFIX}-ApiGateway-Role`,
      assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    const apiGatewayPolicy = new aws_iam.Policy(this, `${PREFIX}-ApiGateway-Policy`, {
      statements: [
        new aws_iam.PolicyStatement({
          actions: ["dynamodb:PutItem"],
          effect: aws_iam.Effect.ALLOW,
          resources: [userTable.tableArn]
        })
      ]
    });
    apiGatewayExecRole.attachInlinePolicy(apiGatewayPolicy);

    const api = new aws_apigateway.RestApi(this, `${PREFIX}-Api`, {
      restApiName: `${PREFIX}-Rest-Api`,
      description: 'Attempt API'
    });

    const usersResource = api.root.addResource('users');

    // bodyのパラメータバリデーションモデル
    const createUserModel = api.addModel(`${PREFIX}-CreateUserModel`, {
      contentType: 'application/json',
      modelName: 'CreateUserModel',
      schema: {
        title: 'CreateUserModel',
        type: aws_apigateway.JsonSchemaType.OBJECT,
        properties: {
          userId: {type: aws_apigateway.JsonSchemaType.STRING, minLength: 16, maxLength: 16},
          name: {type: aws_apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 16},
          age: {type: aws_apigateway.JsonSchemaType.NUMBER, minimum: 15, maximum: 99},
          phoneNumber: {type: aws_apigateway.JsonSchemaType.STRING, pattern: '^0\\d{10,12}$'}
        },
        required: ['userId', 'name', 'age']
      }
    });

    const createUserResponseModel = api.addModel(`${PREFIX}-CreateUserResponseModel`, {
      contentType: 'application/json',
      modelName: 'CreateUserResponseModel',
      schema: {
        title: 'CreateUserResponseModel',
        type: aws_apigateway.JsonSchemaType.OBJECT,
        properties: {
          userId: {type: aws_apigateway.JsonSchemaType.STRING}
        },
        required: ['userId']
      }
    })

    const handler = new aws_lambda_nodejs.NodejsFunction(this,  `${PREFIX}-Handler`, {
      functionName: `${PREFIX}-Handler`,
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/index.ts',
      handler: 'handler',
    });

    userTable.grantReadWriteData(handler);

    // Note: リクエストパラメータのバリデーションを設定
    const createUserValidator = new aws_apigateway.RequestValidator(this, `${PREFIX}-CreateUser-Validator`, {
      restApi: api,
      requestValidatorName: 'CreateUser-Validator',
      validateRequestBody: true,
      validateRequestParameters: true
    })

    usersResource.addMethod('POST', new aws_apigateway.LambdaIntegration(handler),
      {
        requestModels: {
          'application/json': createUserModel // 設定したバリデーションモデルを紐づけ
        },
        requestValidator: createUserValidator, // 設定したリクエストバリデーションを紐づけ
        methodResponses: [
          {statusCode: '201', responseModels: {'application/json': createUserResponseModel}} // 設定したレスポンスモデルを紐づけ
        ]
      }
    );

    // Note: ユーザー情報取得
    const getUserIntegration = new aws_apigateway.AwsIntegration({
      region: this.region,
      service: 'dynamodb',
      action: 'GetItem',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: apiGatewayExecRole,
        requestTemplates: {
          'application/json': `{
            "TableName": "${userTable.tableName}",
            "Key": {
              "userId": {
                "S": "$input.params('userId')"
              }
            }
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{
                "name": "$input.path('$').Item.name.S",
                "age": "$input.path('$').Item.age.N"
              }`
            }
          }
        ]
      }
    });
    
    const userIdResource = usersResource.addResource('{userId}');
    userIdResource.addMethod('GET', getUserIntegration, 
      {
        methodResponses: [
          {statusCode: '200'}
        ]
      }
    );
  }
}
