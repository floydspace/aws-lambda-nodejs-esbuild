import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import * as es from 'esbuild';
import * as path from 'path';
import { mergeRight, union, without } from 'ramda';

import { packExternalModules } from './pack-externals';
import { NodejsFunctionProps } from './props';
import { extractFileName, findProjectRoot, NodeMajorESMap, nodeMajorVersion } from './utils';

const BUILD_FOLDER = '.build';
const DEFAULT_BUILD_OPTIONS: es.BuildOptions = {
  bundle: true,
  target: NodeMajorESMap[nodeMajorVersion()],
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
    const packager = props.packager ?? true;
    const handler = props.handler ?? 'index.handler';
    const defaultRuntime = nodeMajorVersion() >= 12
      ? lambda.Runtime.NODEJS_12_X
      : lambda.Runtime.NODEJS_10_X;
    const runtime = props.runtime ?? defaultRuntime;
    const entry = extractFileName(projectRoot, handler);

    es.buildSync({
      ...buildOptions,
      external: union(exclude, buildOptions.external || []),
      entryPoints: [path.join(projectRoot, entry)],
      outdir: path.join(projectRoot, BUILD_FOLDER, path.dirname(entry)),
      platform: 'node',
    });

    if (packager) {
      packExternalModules(
        without(exclude, buildOptions.external || []),
        projectRoot,
        path.join(projectRoot, BUILD_FOLDER),
        packager !== true ? packager : undefined,
      );
    }

    super(scope, id, {
      ...props,
      runtime,
      code: lambda.Code.fromAsset(path.join(projectRoot, BUILD_FOLDER)),
      handler,
    });
  }
}
