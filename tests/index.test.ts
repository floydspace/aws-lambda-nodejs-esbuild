jest.mock('esbuild');

import '@aws-cdk/assert/jest';

import { Stack } from '@aws-cdk/core';
import { buildSync } from 'esbuild';
import mockfs from 'mock-fs';

import { NodejsFunction } from '../src';

describe('NodejsFunction tests', () => {
  beforeAll(() => {
    mockfs({
      'index.ts': '',
      'package-lock.json': '',
      '.build': {}
    });
  });

  it('Should not class constructor be thrown', async () => {
    const stack = new Stack();
    const factory = () => new NodejsFunction(stack, 'lambda-function', {});
    expect(factory).not.toThrow();
    expect(buildSync).toBeCalledTimes(1);
    expect(stack).toHaveResource('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });

  afterAll(() => {
    mockfs.restore();
  });
});
