export interface TestFacebookPost {
  facebook_post_id: string;
  message: string | null;
  expectedAddress: string | undefined;
  fuzzy: boolean;
}

export const FACEBOOK_TEST_POSTS: TestFacebookPost[] = [
  {
    facebook_post_id: '100000000000000001',
    message:
      "We're at Riverside Farmers Market at 123 Main St, Springfield, SC 29000 today! Open 7:30am-11:30am. Come grab some amazing seafood!",
    expectedAddress: '123 Main St, Springfield, SC 29000',
    fuzzy: false,
  },
  {
    facebook_post_id: '100000000000000002',
    message: "Hey foodies! We're set up at the Riverside Farmers Market today. Come say hi!",
    expectedAddress: undefined,
    fuzzy: true,
  },
  {
    facebook_post_id: '100000000000000003',
    message: null,
    expectedAddress: undefined,
    fuzzy: true,
  },
];

export function createPostData(post: TestFacebookPost) {
  return {
    post_id: post.facebook_post_id,
    message: post.message,
    created_time: '2026-03-22T10:53:18+0000',
  };
}
