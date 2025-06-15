#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AttemptStack } from '../lib/attempt-stack';

const app = new cdk.App();
new AttemptStack(app, 'AttemptStackStack', {
});