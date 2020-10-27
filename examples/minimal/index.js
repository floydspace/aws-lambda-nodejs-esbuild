const validateIsin = require('isin-validator');

module.exports.handler = (event) => {
  const isInvalid = validateIsin(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: isInvalid ? 'ISIN is invalid!' : 'ISIN is fine!',
      input: event,
    }),
  };
};
