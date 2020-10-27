import * as cdk from '@aws-cdk/core';
import { NodejsFunction } from 'aws-lambda-nodejs-esbuild';

export class CompleteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new NodejsFunction(this, 'CompleteExampleFunction', {
      handler: 'src/index.handler',
      esbuildOptions: {
        external: ['isin-validator']
      }
    });
  }
}
