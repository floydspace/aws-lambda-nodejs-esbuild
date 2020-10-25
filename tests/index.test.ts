jest.mock('esbuild');

import '@aws-cdk/assert/jest';

import { Runtime, RuntimeFamily } from '@aws-cdk/aws-lambda';
import { Stack } from '@aws-cdk/core';
import { buildSync } from 'esbuild';
import mockfs from 'mock-fs';
import path from 'path';

import { NodejsFunction } from '../src';


describe('NodejsFunction tests', () => {
  describe('with valid folder structure', () => {
    beforeAll(() => {
      mockfs({
        'index.ts': '',
        'source/index.ts': '',
        'main.ts': '',
        'a/b/c.ts': '',
        'src': {
          'index.ts': '',
          '.build': {}
        },
        'package-lock.json': '',
        '.build': {}
      });
    });

    beforeEach(() => {
      (buildSync as jest.Mock).mockReset();
    });

    it.each(Runtime.ALL.filter(r => r.family !== RuntimeFamily.NODEJS))('Should be thrown due to not supported runtime', (runtime) => {
      const constructor = () => new NodejsFunction(new Stack(), 'lambda-function', { runtime });
      expect(constructor).toThrowError(/^Only `NODEJS` runtimes are supported.$/);
    });

    it('Should not be thrown', () => {
      const stack = new Stack();
      const constructor = () => new NodejsFunction(stack, 'lambda-function');
      expect(constructor).not.toThrow();
      expect(buildSync).toBeCalledTimes(1);
      expect(stack).toHaveResource('AWS::Lambda::Function', {
        Handler: 'index.handler',
      });
    });

    it.each`
      handler                   | entry
      ${null}                   | ${'index.ts'}
      ${'source/index.handler'} | ${'source/index.ts'}
      ${'main.func'}            | ${'main.ts'}
      ${'a/b/c.h'}              | ${'a/b/c.ts'}
    `('Should be valid entry with default rootDir', ({ handler, entry }) => {
      new NodejsFunction(new Stack(), 'lambda-function', { handler });
      expect(buildSync).toHaveBeenCalledWith(expect.objectContaining({ entryPoints: [entry] }));
    });

    it('Should be valid outdir with custom rootDir', () => {
      new NodejsFunction(new Stack(), 'lambda-function', { rootDir: path.join(__dirname, '../src') });
      expect(buildSync).toHaveBeenCalledWith(expect.objectContaining({ outdir: path.join(__dirname, '../src', '.build') }));
    });

    afterAll(() => {
      mockfs.restore();
    });
  });

  describe('with invalid folder structure', () => {
    beforeAll(() => {
      mockfs();
    });

    it('Should be thrown due to unrecognised root directory', () => {
      const constructor = () => new NodejsFunction(new Stack(), 'lambda-function');
      expect(constructor).toThrowError(/^Cannot find root directory./);
    });

    afterAll(() => {
      mockfs.restore();
    });
  });
});
