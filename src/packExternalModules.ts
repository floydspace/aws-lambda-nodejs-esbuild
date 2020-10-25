import * as fs from 'fs-extra';
import * as path from 'path';
import {
  compose,
  forEach,
  head,
  includes,
  is,
  isEmpty,
  join,
  map,
  mergeRight,
  pick,
  replace,
  split,
  startsWith,
  tail,
  toPairs,
  uniq,
} from 'ramda';

import * as Packagers from './packagers';
import { JSONObject } from './types';

function rebaseFileReferences(pathToPackageRoot: string, moduleVersion: string) {
  if (/^(?:file:[^/]{2}|\.\/|\.\.\/)/.test(moduleVersion)) {
    const filePath = replace(/^file:/, '', moduleVersion);
    return replace(
      /\\/g,
      '/',
      `${startsWith('file:', moduleVersion) ? 'file:' : ''}${pathToPackageRoot}/${filePath}`
    );
  }

  return moduleVersion;
}

/**
 * Add the given modules to a package json's dependencies.
 */
function addModulesToPackageJson(externalModules: string[], packageJson: JSONObject, pathToPackageRoot: string) {
  forEach(externalModule => {
    const splitModule = split('@', externalModule);
    // If we have a scoped module we have to re-add the @
    if (startsWith('@', externalModule)) {
      splitModule.splice(0, 1);
      splitModule[0] = '@' + splitModule[0];
    }
    let moduleVersion = join('@', tail(splitModule));
    // We have to rebase file references to the target package.json
    moduleVersion = rebaseFileReferences(pathToPackageRoot, moduleVersion);
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies[head(splitModule) ?? ''] = moduleVersion;
  }, externalModules);
}

/**
 * Resolve the needed versions of production dependencies for external modules.
 */
function getProdModules(externalModules: { external: string }[], packagePath: string, dependencyGraph: JSONObject) {
  const packageJsonPath = path.join(process.cwd(), packagePath);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJson = require(packageJsonPath);
  const prodModules: string[] = [];

  // only process the module stated in dependencies section
  if (!packageJson.dependencies) {
    return [];
  }

  // Get versions of all transient modules
  forEach(externalModule => {
    const moduleVersion = packageJson.dependencies[externalModule.external];

    if (moduleVersion) {
      prodModules.push(`${externalModule.external}@${moduleVersion}`);

      // Check if the module has any peer dependencies and include them too
      try {
        const modulePackagePath = path.join(
          path.dirname(path.join(process.cwd(), packagePath)),
          'node_modules',
          externalModule.external,
          'package.json'
        );
        const peerDependencies = require(modulePackagePath).peerDependencies as Record<string, string>;
        if (!isEmpty(peerDependencies)) {
          console.log(`Adding explicit peers for dependency ${externalModule.external}`);
          const peerModules = getProdModules(
            compose(map(([external]) => ({ external })), toPairs)(peerDependencies),
            packagePath,
            dependencyGraph
          );
          Array.prototype.push.apply(prodModules, peerModules);
        }
      } catch (e) {
        console.log(`WARNING: Could not check for peer dependencies of ${externalModule.external}`);
      }
    } else {
      if (!packageJson.devDependencies || !packageJson.devDependencies[externalModule.external]) {
        prodModules.push(externalModule.external);
      } else {
        // To minimize the chance of breaking setups we whitelist packages available on AWS here. These are due to the previously missing check
        // most likely set in devDependencies and should not lead to an error now.
        const ignoredDevDependencies = ['aws-sdk'];

        if (!includes(externalModule.external, ignoredDevDependencies)) {
          // Runtime dependency found in devDependencies but not forcefully excluded
          console.log(
            `ERROR: Runtime dependency '${externalModule.external}' found in devDependencies.`
          );
          throw new Error(`dependency error: ${externalModule.external}.`);
        }

        console.log(
          `INFO: Runtime dependency '${externalModule.external}' found in devDependencies. It has been excluded automatically.`
        );
      }
    }
  }, externalModules);

  return prodModules;
}

/**
 * We need a performant algorithm to install the packages for each single
 * function (in case we package individually).
 * (1) We fetch ALL packages needed by ALL functions in a first step
 * and use this as a base npm checkout. The checkout will be done to a
 * separate temporary directory with a package.json that contains everything.
 * (2) For each single compile we copy the whole node_modules to the compile
 * directory and create a (function) compile specific package.json and store
 * it in the compile directory. Now we start npm again there, and npm will just
 * remove the superfluous packages and optimize the remaining dependencies.
 * This will utilize the npm cache at its best and give us the needed results
 * and performance.
 */
export function packExternalModules(externals: string[], compositeModulePath: string) {
  if (!externals || !externals.length) {
    return;
  }

  // Read plugin configuration
  const packagePath = './package.json';
  const packageJsonPath = path.join(process.cwd(), packagePath);

  // Determine and create packager
  const packager = Packagers.get(Packagers.Installer.NPM);

  // Fetch needed original package.json sections
  const sectionNames = packager.copyPackageSectionNames;
  const packageJson = fs.readJsonSync(packageJsonPath);
  const packageSections = pick(sectionNames, packageJson);

  // Get first level dependency graph
  console.log(`Fetch dependency graph from ${packageJsonPath}`);

  const dependencyGraph = packager.getProdDependencies(path.dirname(packageJsonPath), 1);

  // (1) Generate dependency composition
  const externalModules = map(external => ({ external }), externals);
  const compositeModules: JSONObject = uniq(getProdModules(externalModules, packagePath, dependencyGraph));

  if (isEmpty(compositeModules)) {
    // The compiled code does not reference any external modules at all
    console.log('No external modules needed');
    return;
  }

  // (1.a) Install all needed modules
  const compositePackageJson = path.join(compositeModulePath, 'package.json');

  // (1.a.1) Create a package.json
  const compositePackage = mergeRight(
    {
      name: 'externals',
      version: '1.0.0',
      description: `Packaged externals for ${'externals'}`,
      private: true,
    },
    packageSections
  );
  const relativePath = path.relative(compositeModulePath, path.dirname(packageJsonPath));
  addModulesToPackageJson(compositeModules, compositePackage, relativePath);
  fs.writeJsonSync(compositePackageJson, compositePackage);

  // (1.a.2) Copy package-lock.json if it exists, to prevent unwanted upgrades
  const packageLockPath = path.join(path.dirname(packageJsonPath), packager.lockfileName);

  if (fs.existsSync(packageLockPath)) {
    console.log('Package lock found - Using locked versions');
    try {
      let packageLockFile = fs.readJsonSync(packageLockPath);
      packageLockFile = packager.rebaseLockfile(relativePath, packageLockFile);
      if (is(Object)(packageLockFile)) {
        packageLockFile = JSON.stringify(packageLockFile, null, 2);
      }

      fs.writeJsonSync(path.join(compositeModulePath, packager.lockfileName), packageLockFile);
    } catch (err) {
      console.log(`Warning: Could not read lock file: ${err.message}`);
    }
  }

  const start = Date.now();
  console.log('Packing external modules: ' + compositeModules.join(', '));

  packager.install(compositeModulePath);

  console.log(`Package took [${Date.now() - start} ms]`);

  // Prune extraneous packages - removes not needed ones
  const startPrune = Date.now();

  packager.prune(compositeModulePath);

  console.log(`Prune: ${compositeModulePath} [${Date.now() - startPrune} ms]`);
}
