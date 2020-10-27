λ💨 aws-lambda-nodejs-esbuild
==============

[AWS CDK](https://aws.amazon.com/cdk/) Construct to build Node.js AWS lambdas using [esbuild](https://github.com/evanw/esbuild).

[![Build Status](https://img.shields.io/github/workflow/status/floydspace/aws-lambda-nodejs-esbuild/release)](https://github.com/floydspace/aws-lambda-nodejs-esbuild/actions)
[![Coverage Status](https://coveralls.io/repos/github/floydspace/aws-lambda-nodejs-esbuild/badge.svg?branch=master)](https://coveralls.io/github/floydspace/aws-lambda-nodejs-esbuild?branch=master)
[![npm version](https://badge.fury.io/js/aws-lambda-nodejs-esbuild.svg)](https://badge.fury.io/js/aws-lambda-nodejs-esbuild)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


Table of Contents
-----------------
- [Features](#features)
- [Installation](#installation)
- [Configure](#configure)
- [Usage](#usage)
- [Author](#author)


Features
--------

* Zero-config: Works out of the box without the need to install any other packages
* Supports ESNext and TypeScript syntax with transforming limitations (See *Note*)

*Note*: The default JavaScript syntax target is set to [`ES2017`](https://node.green/#ES2017), so the final bundle will be supported by all [AWS Lambda Node.js runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html). If you still using an old lambda runtime and have to respect it you can play with esbuild `target` option, see [JavaScript syntax support](https://github.com/evanw/esbuild#javascript-syntax-support) for more details about syntax transform limitations.


Installation
------------

```sh
yarn add --dev @aws-cdk/aws-lambda aws-lambda-nodejs-esbuild
# or
npm install -D @aws-cdk/aws-lambda aws-lambda-nodejs-esbuild
```


Configure
---------

By default, no configuration required, but you can change esbuild behavior:

```ts
  import * as cdk from '@aws-cdk/core';
  import { NodejsFunction } from 'aws-lambda-nodejs-esbuild';

  class NewStack extends cdk.Stack {
    constructor(scope, id, props) {
      super(scope, id, props);

      new NodejsFunction(this, 'NewFunction', {
        esbuildOptions: {
          minify: false, // default
          target: 'ES2017', // default
        }
      });
    }
  }
```

Check [esbuild](https://github.com/evanw/esbuild#command-line-usage) documentation for the full list of available options. Note that some options like `entryPoints` or `outdir` cannot be overwritten.
The package specified in the `exclude` option is passed to esbuild as `external`, but it is not included in the function bundle either. The default value for this option is `['aws-sdk']`.


Usage
-----

The normal AWS CDK deploy procedure will automatically compile with `esbuild`:

- Create the AWS CDK project with `cdk init app --language=typescript`
- Install `aws-lambda-nodejs-esbuild` as above
- Deploy with `cdk deploy`

See examples: [minimal](examples/minimal/README.md) and [complete](examples/complete/README.md)


Author
------

[Victor Korzunin](https://floydspace.github.io/)
