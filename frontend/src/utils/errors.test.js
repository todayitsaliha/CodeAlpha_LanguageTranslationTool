import { ApiError } from '../api/client';
import { toDisplayError } from './errors';

describe('toDisplayError', () => {
  it('keeps the message and request id of API errors', () => {
    const error = new ApiError('Too many requests.', {
      kind: 'http',
      status: 429,
      requestId: 'abc',
    });
    expect(toDisplayError(error)).toEqual({ message: 'Too many requests.', requestId: 'abc' });
  });

  it('never leaks the text of unexpected errors', () => {
    const result = toDisplayError(new TypeError('Cannot read properties of undefined'));
    expect(result.message).toBe('Something unexpected happened. Please try again.');
    expect(result.requestId).toBeUndefined();
  });
});
