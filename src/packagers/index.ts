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
import { getCurrentPackager, getPackagerFromLockfile } from '../utils';

const registeredPackagers = {
  npm: new NPM(),
  yarn: new Yarn()
};

/**
 * Factory method.
 * @param {string} packagerId - Well known packager id.
 */
export function get(cwd: string, packagerId?: keyof typeof registeredPackagers): Packager {
  const pkger = findPackager(cwd, packagerId);

  if (!(pkger in registeredPackagers)) {
    const message = `Could not find packager '${pkger}'`;
    console.log(`ERROR: ${message}`);
    throw new Error(message);
  }

  return registeredPackagers[pkger];
}

/**
 * Determine what package manager to use based on what preference is set,
 * and whether it's currently running in a yarn/npm script
 *
 * @export
 * @param {InstallConfig} config
 * @returns {SupportedPackageManagers}
 */
function findPackager(cwd: string, prefer?: keyof typeof registeredPackagers): keyof typeof registeredPackagers {
  let pkgManager: keyof typeof registeredPackagers | null = prefer || getCurrentPackager();

  if (!pkgManager) {
    pkgManager = getPackagerFromLockfile(cwd);
  }

  if (!pkgManager) {
    for (const pkg in registeredPackagers) {
      if (registeredPackagers[pkg].isManagerInstalled(cwd)) {
        pkgManager = pkg as keyof typeof registeredPackagers;
        break;
      }
    }
  }

  if (!pkgManager) {
    throw new Error('No supported package manager found');
  }

  return pkgManager;
}
