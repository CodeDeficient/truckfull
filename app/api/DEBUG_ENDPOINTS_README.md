# Debug & Test API Endpoints - Security Guidelines

## 🔒 Security Status: PROTECTED

All debug and test API endpoints in this directory are **automatically blocked in production** through a two-layer security approach.

---

## 🛡️ Protection Layers

### Layer 1: Middleware Protection (Primary)

**Location**: `middleware.ts:6-15`

All routes matching `/api/debug-*` and `/api/test-*` are automatically blocked at the middleware level in production environments.

**Returns**: `404 Not Found` in production
**Logs**: Security warning when access is attempted

### Layer 2: Wrapper Function (Defense-in-Depth)

**Location**: `lib/api/debugWrapper.ts`

Optional wrapper function provides route-level protection as a secondary defense layer.

---

## 📝 Creating New Debug Endpoints

### Option 1: Using the Wrapper (Recommended)

```typescript
// app/api/debug-example/route.ts
import { NextResponse } from 'next/server';
import { withDebugProtection } from '@/lib/api/debugWrapper';

async function handler() {
  // Your debug logic here
  return NextResponse.json({
    debug: 'This only works in development',
    data: {
      /* ... */
    },
  });
}

// 🔒 Protected: This endpoint is blocked in production
export const GET = withDebugProtection(handler);
```

### Option 2: Without Wrapper (Middleware Only)

```typescript
// app/api/debug-example/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Middleware automatically blocks this in production
  return NextResponse.json({
    debug: 'This only works in development',
    data: {
      /* ... */
    },
  });
}
```

**Note**: The middleware provides sufficient protection for all debug/test endpoints. The wrapper is optional but recommended for defense-in-depth.

---

## ✅ Environment Behavior

| Environment                                        | Debug Endpoints Accessible? | Notes               |
| -------------------------------------------------- | --------------------------- | ------------------- |
| **Local Development** (`NODE_ENV=development`)     | ✅ Yes                      | Fully functional    |
| **Local Production Build** (`NODE_ENV=production`) | ❌ No                       | Returns 404         |
| **Vercel Preview** (`VERCEL_ENV=preview`)          | ✅ Yes\*                    | \*Can be configured |
| **Vercel Production** (`VERCEL_ENV=production`)    | ❌ No                       | Returns 404         |

---

## 🧪 Testing Debug Endpoints

### Local Development (Should Work)

```bash
# Start dev server
npm run dev

# Test debug endpoint
curl http://localhost:3000/api/debug-env-vars
# Expected: Returns debug data ✅
```

### Production Simulation (Should Block)

```bash
# Build and run production locally
npm run build
NODE_ENV=production npm start

# Test debug endpoint
curl http://localhost:3000/api/debug-env-vars
# Expected: {"error":"Not Found"} with 404 status ✅
```

### Vercel Production (Should Block)

```bash
# After deployment to Vercel production
curl https://your-app.vercel.app/api/debug-env-vars
# Expected: 404 Not Found ✅
```

---

## 🎯 Naming Conventions

To ensure automatic protection, debug and test endpoints **MUST** follow these naming patterns:

### Debug Endpoints

- ✅ `/api/debug-*` (e.g., `/api/debug-session`, `/api/debug-env-vars`)
- ✅ Use kebab-case for consistency

### Test Endpoints

- ✅ `/api/test-*` (e.g., `/api/test-auth`, `/api/test-db`)
- ✅ Use kebab-case for consistency

### ❌ Invalid Patterns (Not Protected)

- ❌ `/api/my-debug` (doesn't start with `debug-`)
- ❌ `/api/debugEndpoint` (doesn't use kebab-case)
- ❌ `/api/testing-route` (should be `test-*` not `testing-*`)

---

## 📋 Checklist for New Debug Endpoints

When creating a new debug endpoint, ensure:

- [ ] Route path starts with `/api/debug-` or `/api/test-`
- [ ] (Optional) Uses `withDebugProtection()` wrapper for defense-in-depth
- [ ] Tested locally in development (works)
- [ ] Tested locally with `NODE_ENV=production` (returns 404)
- [ ] Does not expose sensitive production data
- [ ] Includes clear comments explaining purpose
- [ ] Added to this README if it's a commonly used debug endpoint

---

## 🔍 Common Debug Endpoints

### Authentication & Session

- `/api/debug-session` - View current session data
- `/api/debug-jwt` - Decode JWT tokens
- `/api/debug-cookies` - View cookie data
- `/api/debug-auth` - Check authentication status

### Environment & Configuration

- `/api/debug-env-vars` - View environment variable status
- `/api/debug-env` - Environment information
- `/api/debug-supabase-config` - Supabase configuration

### Database & Data

- `/api/debug-db-structure` - View database schema
- `/api/debug-trucks` - View raw truck data
- `/api/debug-users` - View user data

### Testing & Utilities

- `/api/test-admin` - Test admin access
- `/api/test-auth-flow` - Test authentication flow
- `/api/test-integration` - Integration testing

---

## ⚠️ Security Best Practices

1. **Never expose real secrets**: Even in debug endpoints, use `[SET]`/`[NOT SET]` instead of actual values
2. **Limit PII exposure**: Don't return full user records; use IDs and status only
3. **Use wrapper for sensitive endpoints**: Apply `withDebugProtection()` to highly sensitive debug routes
4. **Document purpose**: Add comments explaining what each debug endpoint does
5. **Clean up regularly**: Remove unused debug endpoints

---

## 🚨 Production Deployment Checklist

Before deploying to production:

- [x] Middleware protection enabled (`middleware.ts`)
- [x] All debug routes follow naming convention (`/api/debug-*` or `/api/test-*`)
- [x] Tested protection in production mode locally
- [x] Security report updated (`docs/SECURITY_RED_TEAM_ASSESSMENT.md`)
- [ ] No debug endpoints bypass protection

---

## 📚 References

- **Middleware Implementation**: `middleware.ts:6-15`
- **Wrapper Utility**: `lib/api/debugWrapper.ts`
- **Security Report**: `docs/SECURITY_RED_TEAM_ASSESSMENT.md`
- **Example Endpoints**:
  - `app/api/debug-env-vars/route.ts`
  - `app/api/debug-jwt/route.ts`

---

## 🤝 Contributing

When adding new debug endpoints:

1. Follow the naming convention (`/api/debug-*` or `/api/test-*`)
2. (Optional) Use `withDebugProtection()` wrapper
3. Test both development and production modes
4. Update this README if adding a commonly used endpoint
5. Never commit actual secrets or sensitive data

---

**Last Updated**: 2025-11-29
**Security Status**: ✅ All debug endpoints protected in production
