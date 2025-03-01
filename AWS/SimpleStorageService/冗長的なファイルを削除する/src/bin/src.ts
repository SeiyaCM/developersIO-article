#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SrcStack } from '../lib/src-stack';

const app = new cdk.App();
new SrcStack(app, 'SrcStack', {
});