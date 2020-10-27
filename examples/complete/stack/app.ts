import * as cdk from '@aws-cdk/core';
import { CompleteStack } from './stack';

const app = new cdk.App();
new CompleteStack(app, 'CompleteStack');
