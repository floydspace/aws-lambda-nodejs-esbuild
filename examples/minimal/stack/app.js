const cdk = require('@aws-cdk/core');
const { MinimalStack } = require('./stack');

const app = new cdk.App();
new MinimalStack(app, 'MinimalStack');
