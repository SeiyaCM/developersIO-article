import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs'
import { 
  RemovalPolicy,
  aws_dynamodb,
  aws_iot,
  aws_iam,
 } from 'aws-cdk-lib';

const PREFIX = 'Attempt';

export class AttemptStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const sensorDataTable = new aws_dynamodb.Table(this, `${PREFIX}-SensorDataTable`, {
      tableName: `${PREFIX}SensorData`,
      partitionKey: {
        name: 'deviceId',
        type: aws_dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'datetime',
        type: aws_dynamodb.AttributeType.STRING
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // 本番環境では RETAIN に変更することを推奨
    });

    // IoT Policy
    const iotPolicy = new aws_iot.CfnPolicy(this, `${PREFIX}-IoTPolicy`, {
      policyName: `${PREFIX}Policy`,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'iot:Connect',
              'iot:Publish',
              'iot:Subscribe',
              'iot:Receive'
            ],
            Resource: '*'
          }
        ]
      }
    });

    // IAM Role for IoT Rule
    const iotRuleRole = new aws_iam.Role(this, `${PREFIX}-IoTRuleRole`, {
      assumedBy: new aws_iam.ServicePrincipal('iot.amazonaws.com'),
      inlinePolicies: {
        DynamoDBPolicy: new aws_iam.PolicyDocument({
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: [
                'dynamodb:PutItem'
              ],
              resources: [sensorDataTable.tableArn]
            })
          ]
        })
      }
    });

    // IoT Rule to forward data to DynamoDB
    const iotRule = new aws_iot.CfnTopicRule(this, `${PREFIX}-IoTRule`, {
      ruleName: `${PREFIX}Rule`,
      topicRulePayload: {
        sql: "SELECT deviceId, datetime, temperature, humidity FROM 'topic/sensor/data'",
        actions: [
          {
            dynamoDb: {
              tableName: sensorDataTable.tableName,
              roleArn: iotRuleRole.roleArn,
              hashKeyField: 'deviceId',
              hashKeyValue: '${deviceId}',
              rangeKeyField: 'datetime',
              rangeKeyValue: '${datetime}'
            }
          }
        ],
        ruleDisabled: false
      }
    });

    // Outputs
    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: sensorDataTable.tableName,
      description: 'DynamoDB Table Name for Sensor Data'
    });

    new cdk.CfnOutput(this, 'IoTRuleName', {
      value: iotRule.ref,
      description: 'IoT Rule Name for DynamoDB Integration'
    });

    new cdk.CfnOutput(this, 'IoTTopicPattern', {
      value: 'topic/sensor/data',
      description: 'IoT Topic Pattern for sending data to DynamoDB'
    });
  }
}
