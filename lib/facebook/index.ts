/**
 * Facebook integration module
 * @module lib/facebook
 */

export {
  getUserFacebookPages,
  getPageDetails,
  validateAccessToken,
  getPagePosts,
} from './graphApi';

export type { FacebookPage } from './graphApi';

export { parseSignedRequest } from './parseSignedRequest';
export type { FacebookSignedRequestPayload } from './parseSignedRequest';

export { findFacebookUser } from './findFacebookUser';
export type { FindFacebookUserResult } from './findFacebookUser';
