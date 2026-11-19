export const ALLOWED_METHOD = 'GET';
export const ALLOWED_PATH = '/search';

export function validateSearxngRequest(method, pathname, searchParams) {
  if (method !== ALLOWED_METHOD) {
    return { allowed: false, status: 405, error: 'Method not allowed' };
  }

  if (pathname !== ALLOWED_PATH) {
    return { allowed: false, status: 404, error: 'Not found' };
  }

  if (searchParams.get('format') !== 'json') {
    return { allowed: false, status: 400, error: 'format=json is required' };
  }

  return { allowed: true };
}
