import { any, head, isEmpty, join, pathOr, split, tail } from 'ramda';

import { JSONObject } from '../types';
import { safeJsonParse, SpawnError, spawnProcess, splitLines } from '../utils';
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

  getProdDependencies(cwd: string, depth?: number) {
    const command = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    const args = ['list', `--depth=${depth || 1}`, '--json', '--production'];

    // If we need to ignore some errors add them here
    const ignoredYarnErrors: {npmError: string}[] = [];

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
          !any(ignoredError => error.startsWith(`npm ERR! ${ignoredError.npmError}`), ignoredYarnErrors)
        );
      }, false);

      if (failed || isEmpty(err.stdout)) {
        throw err;
      }

      processOutput = { stdout: err.stdout };
    }

    const lines = splitLines(processOutput.stdout);
    const parsedLines = lines.map(safeJsonParse);
    const parsedTree = parsedLines.find(line => line && line.type === 'tree');
    const convertTrees = ts => ts.reduce((__, tree: JSONObject) => {
      const splitModule = split('@', tree.name);
      // If we have a scoped module we have to re-add the @
      if (tree.name.startsWith('@')) {
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
        newRef: `${pathToPackageRoot}/${match[1]}`.replace(/\\/g, '/')
      });
    }

    // Replace all lines in lockfile
    return replacements.reduce((__, replacement) => __.replace(replacement.oldRef, replacement.newRef), lockfile);
  }

  install(cwd: string, packagerOptions?) {
    const command = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    const args = [ 'install', '--frozen-lockfile', '--non-interactive' ];

    // Convert supported packagerOptions
    if (packagerOptions?.ignoreScripts) {
      args.push('--ignore-scripts');
    }

    spawnProcess(command, args, { cwd });
  }

  // "Yarn install" prunes automatically
  prune(cwd: string, packagerOptions?) {
    return this.install(cwd, packagerOptions);
  }

  runScripts(cwd, scriptNames: string[]) {
    const command = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';

    scriptNames.forEach(scriptName => spawnProcess(command, ['run', scriptName], { cwd }));
  }
}
