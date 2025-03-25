import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs'
import { 
  aws_lambda,
  aws_lambda_nodejs,
  aws_iam,
  aws_dynamodb
 } from 'aws-cdk-lib';
 import { Duration } from 'aws-cdk-lib';

const PREFIX = 'Attempt';

export class AttemptStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new aws_dynamodb.Table(this, `${PREFIX}-Table`, {
      tableName: `${PREFIX}-Table`,
      partitionKey: { name: 'userId', type: aws_dynamodb.AttributeType.STRING },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const roleA = new aws_iam.Role(this, `${PREFIX}-RoleA`, {
      roleName: `${PREFIX}-Lambda-RoleA`,
      assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    roleA.addToPolicy(new aws_iam.PolicyStatement({
      actions: ['dynamodb:GetItem'],
      resources: [table.tableArn],
      conditions: {
        StringEquals: {
          'dynamodb:Attributes': ['userId', 'topScore']
        }
      }
    }));

    const roleB = new aws_iam.Role(this, `${PREFIX}-RoleB`, {
      roleName: `${PREFIX}-Lambda-RoleB`,
      assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com')
    });
    // Note: RoleBはuserIdとwinsのみにアクセスできる
    roleB.addToPolicy(new aws_iam.PolicyStatement({
      effect: aws_iam.Effect.ALLOW,
      actions: ['dynamodb:GetItem'],
      resources: [table.tableArn],
      conditions: {
        "ForAllValues:StringEquals": {
          "dynamodb:Attributes": [
              "userId",
              "wins"
          ]
      },
        "StringEqualsIfExists": {
          "dynamodb:Select": "SPECIFIC_ATTRIBUTES"
      }
      }
    }));

    const handlerA = new aws_lambda_nodejs.NodejsFunction(this, `${PREFIX}-NodeFunctionA`, {
      functionName: `${PREFIX}-FunctionA`,
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/index.ts',
      handler: 'handler',
      timeout: Duration.seconds(75),
      environment: {
        TABLE_NAME: table.tableName,
      }
    });
    table.grantReadData(handlerA);

    const handlerB = new aws_lambda_nodejs.NodejsFunction(this, `${PREFIX}-NodeFunctionB`, {
      functionName: `${PREFIX}-FunctionB`,
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      role: roleB,
      entry: 'lambda/index.ts',
      handler: 'handler',
      timeout: Duration.seconds(75),
      environment: {
        TABLE_NAME: table.tableName,
      }
    });
  }
}
