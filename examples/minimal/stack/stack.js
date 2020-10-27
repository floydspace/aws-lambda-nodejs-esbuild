const cdk = require('@aws-cdk/core');
const { NodejsFunction } = require('aws-lambda-nodejs-esbuild');

class MinimalStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new NodejsFunction(this, 'MinimalExampleFunction');
  }
}

module.exports = { MinimalStack };
