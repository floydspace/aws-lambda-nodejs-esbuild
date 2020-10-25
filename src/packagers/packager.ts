import { JSONObject } from '../types';

export interface Packager {
  lockfileName: string;
  copyPackageSectionNames: Array<string>;
  mustCopyModules: boolean;
  getProdDependencies(cwd: string, depth: number): JSONObject;
  rebaseLockfile(pathToPackageRoot: string, lockfile: JSONObject): void;
  install(cwd: string): void;
  prune(cwd: string): void;
  runScripts(cwd: string, scriptNames): void;
}
