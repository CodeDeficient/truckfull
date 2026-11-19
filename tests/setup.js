// tests/setup.js
// Setup environment variables using the unified approach
// This file is maintained for backward compatibility but loads from the central config
const path = require('path');

// Load environment variables from the unified setup file
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Also load from the test-specific .env file if it exists, to allow test-specific overrides
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), 'tests/.env.test') });
} catch (error) {
  // It's OK if the test-specific .env doesn't exist
}

// Ensure required environment variables for tests are set with defaults
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
