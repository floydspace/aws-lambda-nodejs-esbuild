/**
 * Factory for supported packagers.
 *
 * All packagers must implement the following interface:
 *
 * interface Packager {
 *
 * static get lockfileName(): string;
 * static get copyPackageSectionNames(): Array<string>;
 * static get mustCopyModules(): boolean;
 * static getProdDependencies(cwd: string, depth: number = 1): Object;
 * static rebaseLockfile(pathToPackageRoot: string, lockfile: Object): void;
 * static install(cwd: string): void;
 * static prune(cwd: string): void;
 * static runScripts(cwd: string, scriptNames): void;
 *
 * }
 */

import { Packager } from './packager';
import { NPM } from './npm';
import { Yarn } from './yarn';

const registeredPackagers = {
  npm: new NPM(),
  yarn: new Yarn()
};

export enum Installer {
  NPM = 'npm',
  YARN = 'yarn',
}

/**
 * Factory method.
 * @param {string} packagerId - Well known packager id.
 */
export function get(packagerId: Installer): Packager {
  if (!(packagerId in registeredPackagers)) {
    const message = `Could not find packager '${packagerId}'`;
    console.log(`ERROR: ${message}`);
    throw new Error(message);
  }
  return registeredPackagers[packagerId];
}
