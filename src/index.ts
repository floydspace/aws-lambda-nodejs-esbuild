import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import * as es from 'esbuild';
import * as path from 'path';
import { mergeRight, union, without } from 'ramda';

import { packExternalModules } from './packExternalModules';
import { extractFileName, findProjectRoot, nodeMajorVersion } from './utils';

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
   * The esbuild bundler specific options.
   *
   * @default = { platform: 'node' }
   */
  readonly esbuildOptions?: es.BuildOptions;
}

const BUILD_FOLDER = '.build';
const DEFAULT_BUILD_OPTIONS: es.BuildOptions = {
  bundle: true,
  target: 'es2017',
};

/**
 * A Node.js Lambda function bundled using `esbuild`
 */
export class NodejsFunction extends lambda.Function {
  constructor(scope: cdk.Construct, id: string, props: NodejsFunctionProps = {}) {
    if (props.runtime && props.runtime.family !== lambda.RuntimeFamily.NODEJS) {
      throw new Error('Only `NODEJS` runtimes are supported.');
    }

    const projectRoot = findProjectRoot(props.rootDir);
    if (!projectRoot) {
      throw new Error('Cannot find root directory. Please specify it with `rootDir` option.');
    }

    const withDefaultOptions = mergeRight(DEFAULT_BUILD_OPTIONS);
    const buildOptions = withDefaultOptions<es.BuildOptions>(props.esbuildOptions ?? {});
    const exclude = union(props.exclude || [], ['aws-sdk']);
    const handler = props.handler ?? 'index.handler';
    const defaultRunTime = nodeMajorVersion() >= 12
      ? lambda.Runtime.NODEJS_12_X
      : lambda.Runtime.NODEJS_10_X;
    const runtime = props.runtime ?? defaultRunTime;
    const entry = extractFileName(projectRoot, handler);

    es.buildSync({
      ...buildOptions,
      external: union(exclude, buildOptions.external || []),
      entryPoints: [entry],
      outdir: path.join(projectRoot, BUILD_FOLDER, path.dirname(entry)),
      platform: 'node',
    });

    packExternalModules(without(exclude, buildOptions.external || []), path.join(projectRoot, BUILD_FOLDER));

    super(scope, id, {
      ...props,
      runtime,
      code: lambda.Code.fromAsset(path.join(projectRoot, BUILD_FOLDER)),
      handler,
    });
  }
}
