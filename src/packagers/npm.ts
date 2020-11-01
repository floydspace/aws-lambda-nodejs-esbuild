import { any, isEmpty } from 'ramda';

import { JSONObject } from '../types';
import { SpawnError, spawnProcess } from '../utils';
import { Packager } from './packager';

/**
 * NPM packager.
 */
export class NPM implements Packager {
  get lockfileName() {
    return 'package-lock.json';
  }

  get copyPackageSectionNames() {
    return [];
  }

  get mustCopyModules() {
    return true;
  }

  isManagerInstalled(cwd: string) {
    const command = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    const args = ['--version'];

    try {
      spawnProcess(command, args, { cwd });
      return true;
    } catch (_e) {
      return false;
    }
  }

  getProdDependencies(cwd: string, depth?: number) {
    // Get first level dependency graph
    const command = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    const args = [
      'ls',
      '-prod', // Only prod dependencies
      '-json',
      `-depth=${depth || 1}`
    ];

    const ignoredNpmErrors = [
      { npmError: 'extraneous', log: false },
      { npmError: 'missing', log: false },
      { npmError: 'peer dep missing', log: true }
    ];

    let processOutput;
    try {
      processOutput = spawnProcess(command, args, { cwd });
    } catch (err) {
      if (!(err instanceof SpawnError)) {
        throw err;
      }

      // Only exit with an error if we have critical npm errors for 2nd level inside
      const errors = err.stderr?.split('\n') ?? [];
      const failed = errors.reduce((f, error) => {
        if (f) {
          return true;
        }
        return (
          !isEmpty(error) &&
          !any(ignoredError => error.startsWith(`npm ERR! ${ignoredError.npmError}`), ignoredNpmErrors)
        );
      }, false);

      if (failed || isEmpty(err.stdout)) {
        throw err;
      }

      processOutput = { stdout: err.stdout };
    }

    return JSON.parse(processOutput.stdout);
  }

  /**
   * We should not be modifying 'package-lock.json'
   * because this file should be treated as internal to npm.
   *
   * Rebase package-lock is a temporary workaround and must be
   * removed as soon as https://github.com/npm/npm/issues/19183 gets fixed.
   */
  rebaseLockfile(pathToPackageRoot: string, lockfile: JSONObject) {
    if (lockfile.version) {
      lockfile.version = this.rebaseFileReferences(pathToPackageRoot, lockfile.version);
    }

    if (lockfile.dependencies) {
      for (const lockedDependency in lockfile.dependencies) {
        this.rebaseLockfile(pathToPackageRoot, lockfile.dependencies[lockedDependency]);
      }
    }

    return lockfile;
  }

  install(cwd) {
    const command = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    const args = ['install'];

    spawnProcess(command, args, { cwd });
  }

  prune(cwd) {
    const command = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    const args = ['prune'];

    spawnProcess(command, args, { cwd });
  }

  runScripts(cwd, scriptNames) {
    const command = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';

    scriptNames.forEach(scriptName => spawnProcess(command, ['run', scriptName], { cwd }));
  }

  private rebaseFileReferences(pathToPackageRoot: string, moduleVersion: string) {
    if (/^file:[^/]{2}/.test(moduleVersion)) {
      const filePath = moduleVersion.replace(/^file:/, '');
      return `file:${pathToPackageRoot}/${filePath}`.replace(/\\/g, '/');
    }

    return moduleVersion;
  }
}
