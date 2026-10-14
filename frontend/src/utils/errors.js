import { ApiError } from '../api/client';

/** Reduces any thrown value to what the UI may show: a safe message and an optional request id. */
export function toDisplayError(error) {
  if (error instanceof ApiError) {
    return { message: error.message, requestId: error.requestId };
  }
  return { message: 'Something unexpected happened. Please try again.' };
}
