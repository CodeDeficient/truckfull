#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imageTag = 'truckfull-container-staging:local';

function main() {
  execFileSync(
    'node',
    [path.join(repoRoot, 'scripts/container/validate-staging-public-build-env.mjs')],
    {
      cwd: repoRoot,
      stdio: 'inherit',
    },
  );

  execFileSync(
    'docker',
    ['build', '-f', 'Dockerfile.container-staging', '-t', imageTag, '.'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
    },
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(
      `[build:container:staging] ${error instanceof Error ? error.message : 'build failed'}`,
    );
    process.exitCode = 1;
  }
}
