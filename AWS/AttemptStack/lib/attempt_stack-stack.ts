import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs'
import { 
  aws_s3,
  RemovalPolicy,
  aws_lambda,
  aws_lambda_nodejs,
  aws_s3_deployment,
  aws_iam
 } from 'aws-cdk-lib';
 import * as s3ObjectLambda from 'aws-cdk-lib/aws-s3objectlambda';
 import { Duration } from 'aws-cdk-lib';

const PREFIX = 'Attempt';

export class AttemptStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new aws_s3.Bucket(this, `${PREFIX}-Bucket`, {
      bucketName: `${this.account}-attempt-bucket`,
      autoDeleteObjects: true, // stackが削除されたときにバケットが自動削除される
      removalPolicy: RemovalPolicy.DESTROY
    });

    const handler = new aws_lambda_nodejs.NodejsFunction(this, `${PREFIX}-NodeFunction`, {
      functionName: `${PREFIX}-Function`,
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/index.ts',
      handler: 'handler',
      timeout: Duration.seconds(75),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        KEY: 'sample.json'
      }
    });

    // lambdaに権限設定
    bucket.grantRead(handler);
    // Note: これが重要
    handler.addToRolePolicy(new aws_iam.PolicyStatement({
      effect: aws_iam.Effect.ALLOW,
      actions: ['s3-object-lambda:WriteGetObjectResponse'],
      resources: ['*'],
    }));

    const accessPoint = new aws_s3.CfnAccessPoint(this, `${PREFIX}-AccessPoint`, {
      bucket: bucket.bucketName,
      name: 'access-point',
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true
      }
    });

    new s3ObjectLambda.CfnAccessPoint(this, `${PREFIX}-LambdaAccessPoint`, {
      name: 's3-object-lambda',
      objectLambdaConfiguration: {
        supportingAccessPoint: accessPoint.attrArn,
        transformationConfigurations: [{
          actions: ['GetObject'],
          contentTransformation: {
            'AwsLambda': {
              'FunctionArn': handler.functionArn
            }
          }
        }]
      }
    });

    // Note: S3に手作業upが面倒なので追加しているだけです。本来は必要ないです
    new aws_s3_deployment.BucketDeployment(this, `${PREFIX}-AssetDeployment`, {
      sources: [aws_s3_deployment.Source.asset('./assets')],
      destinationBucket: bucket,
    });
  }
}
