/**
 * Wrap an async route handler so a rejected promise is forwarded to the error
 * middleware. Express 4 does not await handlers, so without this a thrown error
 * would leave the request hanging instead of producing an error envelope.
 */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
