// tests/test-environment.js
const { TestEnvironment } = require('jest-environment-jsdom');
const path = require('path');

// Extend the default jsdom environment
class CustomTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();

    // Set up window object properties that might be needed
    this.global.window.ENV = 'test';

    // Set up document title for tests if needed
    if (typeof this.global.document !== 'undefined') {
      this.global.document.title = 'Test Document';
    }
  }

  async teardown() {
    // Clean up window properties
    delete this.global.window.ENV;

    await super.teardown();
  }
}

module.exports = CustomTestEnvironment;
