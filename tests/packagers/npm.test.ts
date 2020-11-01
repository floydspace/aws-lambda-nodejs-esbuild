/**
 * Unit tests for packagers/npm
 */

import { join } from 'ramda';
import { NPM } from '../../src/packagers/npm';
import * as Utils from '../../src/utils';

const spawnProcess = jest.spyOn(Utils, 'spawnProcess');

describe('npm', () => {
  let npmModule: NPM;

  beforeAll(() => {
    npmModule = new NPM();
  });

  it('should return "package-lock.json" as lockfile name', () => {
    expect(npmModule.lockfileName).toEqual('package-lock.json');
  });

  it('should return no packager sections', () => {
    expect(npmModule.copyPackageSectionNames).toEqual([]);
  });

  it('requires to copy modules', () => {
    expect(npmModule.mustCopyModules).toBe(true);
  });

  describe('install', () => {
    it('should use npm install', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: 'installed successfully', stderr: '' });

      const result = npmModule.install('myPath');

      expect(result).toBeUndefined();
      expect(spawnProcess).toHaveBeenCalledTimes(1);
      expect(spawnProcess).toHaveBeenCalledWith(expect.stringMatching(/^npm/), ['install'], {
        cwd: 'myPath'
      });
    });
  });

  describe('prune', () => {
    it('should use npm prune', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: 'success', stderr: '' });

      const result = npmModule.prune('myPath');

      expect(result).toBeUndefined();
      expect(spawnProcess).toHaveBeenCalledTimes(1);
      expect(spawnProcess).toHaveBeenCalledWith(expect.stringMatching(/^npm/), ['prune'], {
        cwd: 'myPath'
      });
    });
  });

  describe('runScripts', () => {
    it('should use npm run for the given scripts', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: 'success', stderr: '' });

      const result = npmModule.runScripts('myPath', ['s1', 's2']);

      expect(result).toBeUndefined();
      expect(spawnProcess).toHaveBeenCalledTimes(2);
      expect(spawnProcess).toHaveBeenNthCalledWith(1, expect.stringMatching(/^npm/), ['run', 's1'], {
        cwd: 'myPath'
      });
      expect(spawnProcess).toHaveBeenNthCalledWith(2, expect.stringMatching(/^npm/), ['run', 's2'], {
        cwd: 'myPath'
      });
    });
  });

  describe('getProdDependencies', () => {
    it('should use npm ls', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: '{}', stderr: '' });

      const result = npmModule.getProdDependencies('myPath', 10);

      expect(result).toEqual({});
      expect(spawnProcess).toHaveBeenCalledTimes(1);
      expect(spawnProcess).toHaveBeenCalledWith(expect.stringMatching(/^npm/), [
        'ls',
        '-prod',
        '-json',
        '-depth=10'
      ], {
        cwd: 'myPath'
      });
    });

    it('should default to depth 1', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: '{}', stderr: '' });

      const result = npmModule.getProdDependencies('myPath');

      expect(result).toEqual({});
      expect(spawnProcess).toHaveBeenCalledTimes(1);
      expect(spawnProcess).toHaveBeenCalledWith(expect.stringMatching(/^npm/), [
        'ls',
        '-prod',
        '-json',
        '-depth=1'
      ], {
        cwd: 'myPath'
      });
    });
  });

  it('should reject if npm returns critical and minor errors', () => {
    const stderr =
      'ENOENT: No such file\nnpm ERR! extraneous: sinon@2.3.8 ./babel-dynamically-entries/node_modules/serverless-webpack/node_modules/sinon\n\n';
    spawnProcess.mockReset().mockImplementation(() => {
      throw new Utils.SpawnError('Command execution failed', '{}', stderr);
    });

    const func = () => npmModule.getProdDependencies('myPath', 1);

    expect(func).toThrowError('Command execution failed');
    // npm ls and npm prune should have been called
    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(spawnProcess).toHaveBeenCalledWith(expect.stringMatching(/^npm/), [
      'ls',
      '-prod',
      '-json',
      '-depth=1'
    ], {
      cwd: 'myPath'
    });
  });

  it('should reject if an error happens without any information in stdout', () => {
    spawnProcess.mockReset().mockImplementation(() => {
      throw new Utils.SpawnError('Command execution failed', '', '');
    });

    const func = () => npmModule.getProdDependencies('myPath', 1);

    expect(func).toThrowError('Command execution failed');
    // npm ls and npm prune should have been called
    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(spawnProcess).toHaveBeenCalledWith(expect.stringMatching(/^npm/), [
      'ls',
      '-prod',
      '-json',
      '-depth=1'
    ], {
      cwd: 'myPath'
    });
  });

  it('should ignore minor local NPM errors and log them', () => {
    const stderr = join('\n', [
      'npm ERR! extraneous: sinon@2.3.8 ./babel-dynamically-entries/node_modules/serverless-webpack/node_modules/sinon',
      'npm ERR! missing: internalpackage-1@1.0.0, required by internalpackage-2@1.0.0',
      'npm ERR! peer dep missing: sinon@2.3.8'
    ]);
    const lsResult = {
      version: '1.0.0',
      problems: [
        'npm ERR! extraneous: sinon@2.3.8 ./babel-dynamically-entries/node_modules/serverless-webpack/node_modules/sinon',
        'npm ERR! missing: internalpackage-1@1.0.0, required by internalpackage-2@1.0.0',
        'npm ERR! peer dep missing: sinon@2.3.8'
      ],
      dependencies: {
        '@scoped/vendor': '1.0.0',
        uuid: '^5.4.1',
        bluebird: '^3.4.0'
      }
    };

    spawnProcess.mockReset().mockImplementation(() => {
      throw new Utils.SpawnError('Command execution failed', JSON.stringify(lsResult), stderr);
    });

    const dependencies = npmModule.getProdDependencies('myPath', 1);

    // npm ls and npm prune should have been called
    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(spawnProcess).toHaveBeenCalledWith(expect.stringMatching(/^npm/), [
      'ls',
      '-prod',
      '-json',
      '-depth=1'
    ], {
      cwd: 'myPath'
    });
    expect(dependencies).toEqual(lsResult);
  });

  it('should rebase lock file references', () => {
    const expectedLocalModule = 'file:../../locals/../../mymodule';
    const fakePackageLockJSON = {
      name: 'test-service',
      version: '1.0.0',
      description: 'Packaged externals for test-service',
      private: true,
      dependencies: {
        '@scoped/vendor': '1.0.0',
        uuid: {
          version: '^5.4.1'
        },
        bluebird: {
          version: '^3.4.0'
        },
        localmodule: {
          version: 'file:../../mymodule'
        }
      }
    };
    const expectedPackageLockJSON = {
      name: 'test-service',
      version: '1.0.0',
      description: 'Packaged externals for test-service',
      private: true,
      dependencies: {
        '@scoped/vendor': '1.0.0',
        uuid: {
          version: '^5.4.1'
        },
        bluebird: {
          version: '^3.4.0'
        },
        localmodule: {
          version: expectedLocalModule
        }
      }
    };

    expect(npmModule.rebaseLockfile('../../locals', fakePackageLockJSON)).toEqual(expectedPackageLockJSON);
  });
});
