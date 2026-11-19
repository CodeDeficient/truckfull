# Database Integration Tests

This directory contains integration tests that verify database functionality.

## PostGIS Extension Compatibility Tests (`postgis-extension.test.ts`)

### Purpose

These tests verify that the PostGIS extension works correctly after being migrated from the `public` schema to the `extensions` schema. This migration is critical for maintaining spatial query functionality.

### What These Tests Verify

1. **PostGIS Function Availability** - Ensures core PostGIS functions are accessible
2. **Geography Type Support** - Validates that geography columns work correctly
3. **RPC Function Integration** - Tests spatial RPC functions using PostGIS
4. **Search Path Compatibility** - Confirms functions work regardless of schema location
5. **Geometry Calculations** - Validates distance and radius calculations
6. **Tables with Geography Columns** - Tests all tables with spatial data
7. **Error Handling** - Ensures graceful handling of edge cases

### Required Environment Variables

These tests require Supabase environment variables to be set:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Running the Tests

Run all PostGIS tests:

```bash
npm test tests/database/postgis-extension.test.ts
```

Run in watch mode:

```bash
npm run test:watch tests/database/postgis-extension.test.ts
```

### Database Requirements

These tests expect a database with:

- PostGIS extension installed and enabled
- `traffic_nodes` table with `location_geog` column
- `hotspots` table with `location_geog` column
- `food_trucks` table with `location_geog` column
- RPC functions:
  - `get_location_traffic_score(p_lat, p_lng, p_radius_meters)`
  - `find_nearby_traffic_nodes(p_lat, p_lng, p_radius_meters, p_limit)`
  - `find_nearby_hotspot(lat, lng, radius_meters)`
  - `find_trucks_within_radius(user_lat, user_lng, radius_meters, max_results)`

### Important Notes

1. **Do NOT run these tests against production** - These tests perform real database operations and could affect production data.

2. **Use local or staging database** - Run tests against a database that matches your development environment.

3. **Tests require actual spatial data** - Some tests verify spatial calculations and expect data to exist in the database.

4. **PostGIS Schema Migration** - These tests verify that functions with `SET search_path = public, extensions` can access PostGIS functions even when the extension is in the `extensions` schema.

### Test Design Philosophy

- **No hardcoded results** - Tests assert types and logical conditions, not exact values
- **No flaky tests** - Use `beforeAll`/`afterAll` for setup and cleanup
- **Real database tests** - Query actual tables and call actual RPC functions
- **Clear comments** - Each test explains what it verifies about PostGIS compatibility

### Troubleshooting

If tests fail:

1. Check that environment variables are set correctly
2. Verify PostGIS extension is installed: `\dx` in psql
3. Check that RPC functions exist and have correct permissions
4. Ensure test database has spatial data
5. Verify search_path settings on RPC functions

### Related Documentation

- `docs/ARCHITECTURE/OVERVIEW.md` - Architecture overview
- `docs/TESTING_PATTERNS.md` - Testing patterns
