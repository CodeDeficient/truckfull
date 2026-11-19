import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Global test setup completed');
  // Add any global setup logic here, such as:
  // - Setting up test data
  // - Starting external services
  // - Initializing databases
}

export default globalSetup;
