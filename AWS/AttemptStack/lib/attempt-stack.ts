import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs'
import { 
  RemovalPolicy,
  aws_iot,
  aws_timestream,
  aws_iam,
  aws_lambda,
  aws_lambda_nodejs
 } from 'aws-cdk-lib';
import * as path from 'path';

const PREFIX = 'Attempt';

export class AttemptStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TimeStream Database
    const timestreamDatabase = new aws_timestream.CfnDatabase(this, `${PREFIX}TimeStreamDatabase`, {
      databaseName: `${PREFIX}Database`,
    });

    // TimeStream Table
    const timestreamTable = new aws_timestream.CfnTable(this, `${PREFIX}TimeStreamTable`, {
      databaseName: timestreamDatabase.ref,
      tableName: `${PREFIX}Table`,
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7'
      },
    });

    // Lambda Function for TimeStream Data Writing
    const timestreamWriterRole = new aws_iam.Role(this, `${PREFIX}LambdaTimestreamRole`, {
      assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        TimestreamWritePolicy: new aws_iam.PolicyDocument({
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: [
                'timestream:WriteRecords',
                'timestream:DescribeEndpoints'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    const timestreamWriterFunction = new aws_lambda_nodejs.NodejsFunction(this, `${PREFIX}TimestreamWriter`, {
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/index.ts',
      handler: 'handler',
      role: timestreamWriterRole,
      environment: {
        TIMESTREAM_DATABASE_NAME: timestreamDatabase.ref,
        TIMESTREAM_TABLE_NAME: timestreamTable.attrName,
        REGION: this.region
      },
      timeout: cdk.Duration.minutes(5)
    });

    // IoT Thing
    const iotThing = new aws_iot.CfnThing(this, `${PREFIX}IoTThing`, {
      thingName: `${PREFIX}Thing`
    });

    // IoT Policy
    const iotPolicy = new aws_iot.CfnPolicy(this, `${PREFIX}IoTPolicy`, {
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
    // const iotRuleRole = new aws_iam.Role(this, `${PREFIX}IoTRuleRole`, {
    //   assumedBy: new aws_iam.ServicePrincipal('iot.amazonaws.com'),
    //   inlinePolicies: {
    //     TimeStreamPolicy: new aws_iam.PolicyDocument({
    //       statements: [
    //         new aws_iam.PolicyStatement({
    //           effect: aws_iam.Effect.ALLOW,
    //           actions: [
    //             'timestream:WriteRecords',
    //             'timestream:DescribeEndpoints'
    //           ],
    //           resources: ['*']
    //         })
    //       ]
    //     })
    //   }
    // });

    // IoT Rule to forward data to TimeStream
    // const iotRule = new aws_iot.CfnTopicRule(this, `${PREFIX}IoTRule`, {
    //   ruleName: `${PREFIX}Rule`,
    //   topicRulePayload: {
    //     sql: "SELECT * FROM 'topic/data'",
    //     actions: [
    //       {
    //         timestream: {
    //           roleArn: iotRuleRole.roleArn,
    //           databaseName: timestreamDatabase.ref,
    //           tableName: timestreamTable.ref,
    //           dimensions: [
    //             {
    //               name: 'device_id',
    //               value: '${clientid()}'
    //             }
    //           ],
    //           timestamp: {
    //             value: '${timestamp()}',
    //             unit: 'MILLISECONDS'
    //           }
    //         }
    //       }
    //     ],
    //     ruleDisabled: false
    //   }
    // });

    // Outputs
    new cdk.CfnOutput(this, 'IoTThingName', {
      value: iotThing.ref,
      description: 'IoT Thing Name'
    });

    new cdk.CfnOutput(this, 'TimeStreamDatabaseName', {
      value: timestreamDatabase.ref,
      description: 'TimeStream Database Name'
    });

    new cdk.CfnOutput(this, 'TimeStreamTableName', {
      value: timestreamTable.ref,
      description: 'TimeStream Table Name'
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: timestreamWriterFunction.functionName,
      description: 'TimeStream Writer Lambda Function Name'
    });
  }
}
