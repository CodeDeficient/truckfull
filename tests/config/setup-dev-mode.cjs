// Set development mode for testing logging functions
// This file runs after environment variables are loaded but before tests
globalThis.process = globalThis.process || {};
globalThis.process.env = globalThis.process.env || {};
globalThis.process.env.NODE_ENV = 'development';
