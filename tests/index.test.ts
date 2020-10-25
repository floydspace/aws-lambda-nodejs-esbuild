import '@aws-cdk/assert/jest';
import { Stack } from '@aws-cdk/core';
import { NodejsFunction } from '../src';

describe('NodejsFunction tests', () => {
  it('Should not class constructor be thrown', async () => {
    const stack = new Stack();
    const factory = () => new NodejsFunction(stack, 'lambda-function', {});
    expect(factory).not.toThrow();
    expect(stack).toHaveResource('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });
});
