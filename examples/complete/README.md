# [aws-lambda-nodejs-esbuild](../../README.md) complete example

This example shows how to use the `aws-lambda-nodejs-esbuild` construct in the most common way.

Any package set as `external` in the `esbuildOptions` will not be bundled into the output file, but packed as a `node_modules` dependency.

If packing a package is not required, for instance if it exists in a layer, you may set it in the option `exclude`, so it will neither be packed nor bundled. `aws-sdk` is excluded by default.
