# [aws-lambda-nodejs-esbuild](../../README.md) minimal example

This example shows how to use the `aws-lambda-nodejs-esbuild` construct with default options.

If you do not provide a `handler` option it assumes that you define a lambda handler as `index.js` file in root folder.

By default it bundles all dependencies in a single file and transpiles to the `ES2017` target.
