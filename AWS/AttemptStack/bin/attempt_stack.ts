#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AttemptStackStack } from '../lib/attempt_stack-stack';

const app = new cdk.App();
new AttemptStackStack(app, 'AttemptStackStack', {
});