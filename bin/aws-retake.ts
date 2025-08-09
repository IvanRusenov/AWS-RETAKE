#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsRetakeStack } from '../lib/aws-retake-stack';

const app = new cdk.App();
new AwsRetakeStack(app, 'AwsRetakeStack', {
    env: {
        region: "eu-central-1"
    }
});