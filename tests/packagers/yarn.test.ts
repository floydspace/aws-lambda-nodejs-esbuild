/**
 * Unit tests for packagers/yarn
 */

import { Yarn } from '../../src/packagers/yarn';
import * as Utils from '../../src/utils';

const spawnProcess = jest.spyOn(Utils, 'spawnProcess');

describe('yarn', () => {
  let yarnModule: Yarn;

  beforeAll(() => {
    yarnModule = new Yarn();
  });

  it('should return "yarn.lock" as lockfile name', () => {
    expect(yarnModule.lockfileName).toEqual('yarn.lock');
  });

  it('should return packager sections', () => {
    expect(yarnModule.copyPackageSectionNames).toEqual(['resolutions']);
  });

  it('does not require to copy modules', () => {
    expect(yarnModule.mustCopyModules).toBe(false);
  });

  describe('getProdDependencies', () => {
    it('should use yarn list', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: '{}', stderr: '' });

      const result = yarnModule.getProdDependencies('myPath', 1);

      expect(result).toBeTruthy();
      expect(spawnProcess).toHaveBeenCalledTimes(1),
      expect(spawnProcess).toHaveBeenCalledWith(
        expect.stringMatching(/^yarn/),
        [ 'list', '--depth=1', '--json', '--production' ],
        { cwd: 'myPath' }
      );
    });

    it('should transform yarn trees to npm dependencies', () => {
      const testYarnResult =
        '{"type":"activityStart","data":{"id":0}}\n' +
        '{"type":"activityTick","data":{"id":0,"name":"archiver@^2.1.1"}}\n' +
        '{"type":"activityTick","data":{"id":0,"name":"bluebird@^3.5.1"}}\n' +
        '{"type":"activityTick","data":{"id":0,"name":"fs-extra@^4.0.3"}}\n' +
        '{"type":"activityTick","data":{"id":0,"name":"mkdirp@^0.5.1"}}\n' +
        '{"type":"activityTick","data":{"id":0,"name":"minimist@^0.0.8"}}\n' +
        '{"type":"activityTick","data":{"id":0,"name":"@sls/webpack@^1.0.0"}}\n' +
        '{"type":"tree","data":{"type":"list","trees":[' +
        '{"name":"archiver@2.1.1","children":[],"hint":null,"color":"bold",' +
        '"depth":0},{"name":"bluebird@3.5.1","children":[],"hint":null,"color":' +
        '"bold","depth":0},{"name":"fs-extra@4.0.3","children":[],"hint":null,' +
        '"color":"bold","depth":0},{"name":"mkdirp@0.5.1","children":[{"name":' +
        '"minimist@0.0.8","children":[],"hint":null,"color":"bold","depth":0}],' +
        '"hint":null,"color":null,"depth":0},{"name":"@sls/webpack@1.0.0",' +
        '"children":[],"hint":null,"color":"bold","depth":0}]}}\n';
      const expectedResult = {
        problems: [],
        dependencies: {
          archiver: {
            version: '2.1.1',
            dependencies: {}
          },
          bluebird: {
            version: '3.5.1',
            dependencies: {}
          },
          'fs-extra': {
            version: '4.0.3',
            dependencies: {}
          },
          mkdirp: {
            version: '0.5.1',
            dependencies: {
              minimist: {
                version: '0.0.8',
                dependencies: {}
              }
            }
          },
          '@sls/webpack': {
            version: '1.0.0',
            dependencies: {}
          }
        }
      };
      spawnProcess.mockReset().mockReturnValue({ stdout: testYarnResult, stderr: '' });

      const result = yarnModule.getProdDependencies('myPath', 1);

      expect(result).toEqual(expectedResult);
    });

    it('should reject on critical yarn errors', () => {
      spawnProcess.mockReset().mockImplementation(() => {
        throw new Utils.SpawnError('Exited with code 1', '', 'Yarn failed.\nerror Could not find module.');
      });

      const func = () => yarnModule.getProdDependencies('myPath', 1);

      expect(func).toThrowError('Exited with code 1');
    });
  });

  describe('rebaseLockfile', () => {
    it('should return the original lockfile', () => {
      const testContent = 'eugfogfoigqwoeifgoqwhhacvaisvciuviwefvc';
      const testContent2 = 'eugfogfoigqwoeifgoqwhhacvaisvciuviwefvc';
      expect(yarnModule.rebaseLockfile('.', testContent)).toEqual(testContent2);
    });

    it('should rebase file references', () => {
      const testContent = `
      acorn@^2.1.0, acorn@^2.4.0:
        version "2.7.0"
        resolved "https://registry.yarnpkg.com/acorn/-/acorn-2.7.0.tgz#ab6e7d9d886aaca8b085bc3312b79a198433f0e7"

      acorn@^3.0.4:
        version "3.3.0"
        resolved "https://registry.yarnpkg.com/acorn/-/acorn-3.3.0.tgz#45e37fb39e8da3f25baee3ff5369e2bb5f22017a"

      otherModule@file:../../otherModule/the-new-version:
        version "1.2.0"

      acorn@^2.1.0, acorn@^2.4.0:
        version "2.7.0"
        resolved "https://registry.yarnpkg.com/acorn/-/acorn-2.7.0.tgz#ab6e7d9d886aaca8b085bc3312b79a198433f0e7"

      "@myCompany/myModule@../../myModule/the-new-version":
        version "6.1.0"
        dependencies:
          aws-xray-sdk "^1.1.6"
          aws4 "^1.6.0"
          base-x "^3.0.3"
          bluebird "^3.5.1"
          chalk "^1.1.3"
          cls-bluebird "^2.1.0"
          continuation-local-storage "^3.2.1"
          lodash "^4.17.4"
          moment "^2.20.0"
          redis "^2.8.0"
          request "^2.83.0"
          ulid "^0.1.0"
          uuid "^3.1.0"

        acorn@^5.0.0, acorn@^5.5.0:
          version "5.5.3"
          resolved "https://registry.yarnpkg.com/acorn/-/acorn-5.5.3.tgz#f473dd47e0277a08e28e9bec5aeeb04751f0b8c9"
      `;

      const expectedContent = `
      acorn@^2.1.0, acorn@^2.4.0:
        version "2.7.0"
        resolved "https://registry.yarnpkg.com/acorn/-/acorn-2.7.0.tgz#ab6e7d9d886aaca8b085bc3312b79a198433f0e7"

      acorn@^3.0.4:
        version "3.3.0"
        resolved "https://registry.yarnpkg.com/acorn/-/acorn-3.3.0.tgz#45e37fb39e8da3f25baee3ff5369e2bb5f22017a"

      otherModule@file:../../project/../../otherModule/the-new-version:
        version "1.2.0"

      acorn@^2.1.0, acorn@^2.4.0:
        version "2.7.0"
        resolved "https://registry.yarnpkg.com/acorn/-/acorn-2.7.0.tgz#ab6e7d9d886aaca8b085bc3312b79a198433f0e7"

      "@myCompany/myModule@../../project/../../myModule/the-new-version":
        version "6.1.0"
        dependencies:
          aws-xray-sdk "^1.1.6"
          aws4 "^1.6.0"
          base-x "^3.0.3"
          bluebird "^3.5.1"
          chalk "^1.1.3"
          cls-bluebird "^2.1.0"
          continuation-local-storage "^3.2.1"
          lodash "^4.17.4"
          moment "^2.20.0"
          redis "^2.8.0"
          request "^2.83.0"
          ulid "^0.1.0"
          uuid "^3.1.0"

        acorn@^5.0.0, acorn@^5.5.0:
          version "5.5.3"
          resolved "https://registry.yarnpkg.com/acorn/-/acorn-5.5.3.tgz#f473dd47e0277a08e28e9bec5aeeb04751f0b8c9"
      `;

      expect(yarnModule.rebaseLockfile('../../project', testContent)).toEqual(expectedContent);
    });
  });

  describe('install', () => {
    it('should use yarn install', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: 'installed successfully', stderr: '' });

      const result = yarnModule.install('myPath', {});

      expect(result).toBeUndefined();
      expect(spawnProcess).toHaveBeenCalledTimes(1);
      expect(spawnProcess).toHaveBeenCalledWith(
        expect.stringMatching(/^yarn/),
        [ 'install', '--frozen-lockfile', '--non-interactive' ],
        {
          cwd: 'myPath'
        }
      );
    });

    it('should use ignoreScripts option', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: 'installed successfully', stderr: '' });

      const result = yarnModule.install('myPath', { ignoreScripts: true });

      expect(result).toBeUndefined();
      expect(spawnProcess).toHaveBeenCalledTimes(1);
      expect(spawnProcess).toHaveBeenCalledWith(
        expect.stringMatching(/^yarn/),
        [ 'install', '--frozen-lockfile', '--non-interactive', '--ignore-scripts' ],
        {
          cwd: 'myPath'
        }
      );
    });
  });

  describe('prune', () => {
    let installStub: jest.SpyInstance;

    beforeAll(() => {
      installStub = jest.spyOn(yarnModule, 'install').mockReturnValue();
    });

    afterAll(() => {
      installStub.mockRestore();
    });

    it('should call install', () => {
      yarnModule.prune('myPath', {});

      expect(installStub).toHaveBeenCalledTimes(1);
      expect(installStub).toHaveBeenCalledWith('myPath', {});
    });
  });

  describe('runScripts', () => {
    it('should use yarn run for the given scripts', () => {
      spawnProcess.mockReset().mockReturnValue({ stdout: 'success', stderr: '' });

      const result = yarnModule.runScripts('myPath', [ 's1', 's2' ]);

      expect(result).toBeUndefined();
      expect(spawnProcess).toHaveBeenCalledTimes(2);
      expect(spawnProcess).toHaveBeenNthCalledWith(1, expect.stringMatching(/^yarn/), [ 'run', 's1' ], {
        cwd: 'myPath'
      });
      expect(spawnProcess).toHaveBeenNthCalledWith(2, expect.stringMatching(/^yarn/), [ 'run', 's2' ], {
        cwd: 'myPath'
      });
    });
  });
});
