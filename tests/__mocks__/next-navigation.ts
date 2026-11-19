export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  prefetch: () => {},
  back: () => {},
  pathname: '/',
  query: {},
  asPath: '/',
});

export const useSearchParams = () => ({
  get: () => {},
});

export const usePathname = () => '/';

export function notFound(): never {
  throw new Error('notFound');
}
