import * as fs from 'fs';
import * as path from 'path';

export function extractFileName(cwd: string, handler: string): string {
  const fnName = path.extname(handler);
  const fnNameLastAppearanceIndex = handler.lastIndexOf(fnName);
  // replace only last instance to allow the same name for file and handler
  const fileName = handler.substring(0, fnNameLastAppearanceIndex);

  // Check if the .ts files exists. If so return that to watch
  if (fs.existsSync(path.join(cwd, fileName + '.ts'))) {
    return fileName + '.ts';
  }

  // Check if the .js files exists. If so return that to watch
  if (fs.existsSync(path.join(cwd, fileName + '.js'))) {
    return fileName + '.js';
  }

  // Can't find the files. Watch will have an exception anyway. So throw one with error.
  console.log(`Cannot locate handler - ${fileName} not found`);
  throw new Error('Compilation failed. Please ensure handler exists with ext .ts or .js');
}

/**
 * Find a file by walking up parent directories
 */
export function findUp(name: string, directory: string = process.cwd()): string | undefined {
  const absoluteDirectory = path.resolve(directory);

  if (fs.existsSync(path.join(directory, name))) {
    return directory;
  }

  const { root } = path.parse(absoluteDirectory);
  if (absoluteDirectory === root) {
    return undefined;
  }

  return findUp(name, path.dirname(absoluteDirectory));
}

export function findProjectRoot(rootDir: string): string {
  return rootDir
    ?? findUp(`.git${path.sep}`)
    ?? findUp('yarn.lock')
    ?? findUp('package-lock.json')
    ?? findUp('package.json');
}

/**
 * Returns the major version of node installation
 */
export function nodeMajorVersion(): number {
  return parseInt(process.versions.node.split('.')[0], 10);
}
