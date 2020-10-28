import { any, head, isEmpty, join, pathOr, reduce, replace, split, startsWith, tail } from 'ramda';

import { JSONObject } from '../types';
import { SpawnError, spawnProcess } from '../utils';
import { Packager } from './packager';

/**
 * Yarn packager.
 *
 * Yarn specific packagerOptions (default):
 *   flat (false) - Use --flat with install
 *   ignoreScripts (false) - Do not execute scripts during install
 */
export class Yarn implements Packager {
  get lockfileName() {
    return 'yarn.lock';
  }

  get copyPackageSectionNames() {
    return ['resolutions'];
  }

  get mustCopyModules() {
    return false;
  }

  isManagerInstalled(cwd: string) {
    const command = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    const args = ['--version'];

    try {
      spawnProcess(command, args, { cwd });
      return true;
    } catch (_e) {
      return false;
    }
  }

  getProdDependencies(cwd, depth) {
    const command = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    const args = ['list', `--depth=${depth || 1}`, '--json', '--production'];

    // If we need to ignore some errors add them here
    const ignoredYarnErrors: {npmError: string}[] = [];

    let processOutput;
    try {
      processOutput = spawnProcess(command, args, { cwd });
    } catch (err) {
      if (err instanceof SpawnError) {
        // Only exit with an error if we have critical npm errors for 2nd level inside
        const errors = err.stderr?.split('\n') ?? [];
        const failed = errors.reduce((f, error) => {
          if (f) {
            return true;
          }
          return (
            !isEmpty(error) &&
            !any(ignoredError => error.startsWith(`npm ERR! ${ignoredError.npmError}`), ignoredYarnErrors)
          );
        }, false);

        if (!failed && !isEmpty(err.stdout)) {
          return { stdout: err.stdout };
        }
      }

      throw err;
    }

    const depJson = processOutput.stdout;
    const parsedTree = JSON.parse(depJson);
    const convertTrees = reduce((__, tree: JSONObject) => {
      const splitModule = split('@', tree.name);
      // If we have a scoped module we have to re-add the @
      if (startsWith('@', tree.name)) {
        splitModule.splice(0, 1);
        splitModule[0] = '@' + splitModule[0];
      }
      __[head(splitModule) ?? ''] = {
        version: join('@', tail(splitModule)),
        dependencies: convertTrees(tree.children)
      };
      return __;
    }, {});

    const trees = pathOr([], ['data', 'trees'], parsedTree);
    const result = {
      problems: [],
      dependencies: convertTrees(trees)
    };
    return result;
  }

  rebaseLockfile(pathToPackageRoot, lockfile) {
    const fileVersionMatcher = /[^"/]@(?:file:)?((?:\.\/|\.\.\/).*?)[":,]/gm;
    const replacements: {oldRef: string, newRef: string}[] = [];
    let match;

    // Detect all references and create replacement line strings
    while ((match = fileVersionMatcher.exec(lockfile)) !== null) {
      replacements.push({
        oldRef: match[1],
        newRef: replace(/\\/g, '/', `${pathToPackageRoot}/${match[1]}`)
      });
    }

    // Replace all lines in lockfile
    return reduce((__, replacement) => replace(__, replacement.oldRef, replacement.newRef), lockfile, replacements);
  }

  install(cwd) {
    const command = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    const args = ['install', '--frozen-lockfile', '--non-interactive'];

    spawnProcess(command, args, { cwd });
  }

  // "Yarn install" prunes automatically
  prune(cwd) {
    return this.install(cwd);
  }

  runScripts(cwd, scriptNames: string[]) {
    const command = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    scriptNames.forEach(scriptName => spawnProcess(command, ['run', scriptName], { cwd }));
  }
}
