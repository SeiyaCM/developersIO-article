import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as dynamoTable from 'aws-cdk-lib/aws-dynamodb';

export class SrcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new dynamoTable.Table(this, `Task-Table`, {
      tableName: `Table`,
      partitionKey: {'name': 'userId', 'type': dynamoTable.AttributeType.STRING},
      sortKey: {'name': 'taskId', type: dynamoTable.AttributeType.STRING}
    });
  }
}
