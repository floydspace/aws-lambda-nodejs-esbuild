import validateIsin from 'isin-validator';

export function handler(event: any) {
  const isInvalid = validateIsin(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: isInvalid ? 'ISIN is invalid!' : 'ISIN is fine!',
      input: event,
    }),
  };
}
