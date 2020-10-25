import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';

import { nodeMajorVersion } from './utils';

export interface NodejsFunctionProps extends lambda.FunctionOptions {
  /**
   * The name of the exported handler in the entry file.
   *
   * @default "handler"
   */
  readonly handler?: string;
  /**
   * The runtime environment. Only runtimes of the Node.js family are
   * supported.
   *
   * @default - `NODEJS_12_X` if `process.versions.node` >= '12.0.0',
   * `NODEJS_10_X` otherwise.
   */
  readonly runtime?: lambda.Runtime;
}

export class NodejsFunction extends lambda.Function {
  constructor(scope: cdk.Construct, id: string, props: NodejsFunctionProps = {}) {
    if (props.runtime && props.runtime.family !== lambda.RuntimeFamily.NODEJS) {
      throw new Error('Only `NODEJS` runtimes are supported.');
    }

    const handler = props.handler ?? 'handler';
    const defaultRunTime = nodeMajorVersion() >= 12
      ? lambda.Runtime.NODEJS_12_X
      : lambda.Runtime.NODEJS_10_X;
    const runtime = props.runtime ?? defaultRunTime;

    super(scope, id, {
      ...props,
      runtime,
      code: lambda.Code.fromInline('TODO'),
      handler: `index.${handler}`,
    });
  }
}
