import * as lambda from '@aws-cdk/aws-lambda';
import { BuildOptions } from 'esbuild';

/**
 * Properties for a NodejsFunction
 */
export interface NodejsFunctionProps extends lambda.FunctionOptions {
  /**
   * The root of the lambda project. If you specify this prop, ensure that
   * this path includes `entry` and any module/dependencies used by your
   * function otherwise bundling will not be possible.
   *
   * @default = the closest path containing a .git folder
   */
  readonly rootDir?: string;

  /**
   * The name of the method within your code that Lambda calls to execute your function.
   *
   * The format includes the file name and handler function.
   * For more information, see https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html.
   *
   * @default = 'index.handler'
   */
  readonly handler?: string;

  /**
   * The runtime environment. Only runtimes of the Node.js family are
   * supported.
   *
   * @default = `NODEJS_12_X` if `process.versions.node` >= '12.0.0',
   * `NODEJS_10_X` otherwise.
   */
  readonly runtime?: lambda.Runtime;

  /**
   * The list of modules that must be excluded from bundle and from externals.
   *
   * @default = ['aws-sdk']
   */
  readonly exclude?: string[];

  /**
   * Whether to use package manager to pack external modules or explicit name of a well known packager.
   *
   * @default = true // Determined based on what preference is set, and whether it's currently running in a yarn/npm script
   */
  readonly packager?: Packager | boolean;

  /**
   * The esbuild bundler specific options.
   *
   * @default = { bundle: true, target: 'es2017' }
   */
  readonly esbuildOptions?: BuildOptions;
}

/**
 * Package manager to pack external modules.
 */
export enum Packager {
  NPM = 'npm',
  YARN = 'yarn',
}
