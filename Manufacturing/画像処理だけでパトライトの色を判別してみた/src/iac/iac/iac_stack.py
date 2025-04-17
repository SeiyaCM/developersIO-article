from typing import Final

from aws_cdk import (
    Stack,
    aws_s3,
    aws_dynamodb,
    aws_lambda,
    RemovalPolicy,
)
from aws_cdk.aws_lambda_event_sources import S3EventSource
from constructs import Construct

PREFIX: Final[str] = "Attempt"

class IacStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        bucket:aws_s3.Bucket = aws_s3.Bucket(
            self, id=f"{PREFIX}-Bucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        dynamo_db:aws_dynamodb.Table = aws_dynamodb.Table(
            self, id=f"{PREFIX}-Judgement-Table",
            table_name=f"{PREFIX}-Judgement".lower(),
            partition_key=aws_dynamodb.Attribute(
                name="equipment-number",
                type=aws_dynamodb.AttributeType.STRING
            ),
            sort_key=aws_dynamodb.Attribute(
                name="file-name",
                type=aws_dynamodb.AttributeType.STRING
            ),
            billing_mode=aws_dynamodb.BillingMode.PROVISIONED,
            removal_policy=RemovalPolicy.DESTROY,
        )

        layer = aws_lambda.LayerVersion.from_layer_version_arn(
            self, f"{PREFIX}-Layer",
            layer_version_arn=f"arn:aws:lambda:{self.region}:770693421928:layer:Klayers-p312-Pillow:5"
        )

        handler:aws_lambda.Function = aws_lambda.Function(
            self, id=f"{PREFIX}-Handler",
            function_name=f"{PREFIX}-Handler",
            code=aws_lambda.Code.from_asset("lambda"),
            handler="index.handler",
            runtime=aws_lambda.Runtime.PYTHON_3_12,
            layers=[layer],
            environment={
                "TABLE_NAME": dynamo_db.table_name
            }
        )

        bucket.grant_read(handler)
        dynamo_db.grant_read_write_data(handler)

        handler.add_event_source(
            S3EventSource(bucket=bucket, events=[aws_s3.EventType.OBJECT_CREATED_PUT])
        )