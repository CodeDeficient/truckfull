import { describe, expect, it } from '@jest/globals';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const GITLEAKS_BIN = `${process.env.HOME}/bin/gitleaks`;

function runGitleaksOnContent(
  content: string,
  fileName = 'sample.ts',
): {
  findings: string[];
  secrets: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitleaks-allowlist-test-'));
  const file = path.join(dir, fileName);
  fs.writeFileSync(file, content);
  try {
    childProcess.spawnSync('git', ['init', '-q'], { cwd: dir });
    childProcess.spawnSync('git', ['add', fileName], { cwd: dir });
    childProcess.spawnSync(
      'git',
      ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fixture'],
      { cwd: dir },
    );
    const reportPath = path.join(dir, 'report.json');
    const result = childProcess.spawnSync(
      GITLEAKS_BIN,
      [
        'detect',
        '--source',
        dir,
        '--config',
        path.join(process.cwd(), '.gitleaks.toml'),
        '--no-banner',
        '--report-format',
        'json',
        '--report-path',
        reportPath,
      ],
      { encoding: 'utf8' },
    );
    const findings: string[] = [];
    const secrets: string[] = [];
    if (fs.existsSync(reportPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        for (const finding of parsed) {
          findings.push(`${finding.RuleID}:${finding.File}:${finding.StartLine}`);
          secrets.push(finding.Secret);
        }
      } catch {
        // leave empty if report is malformed.
      }
    }
    return {
      findings,
      secrets,
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('gitleaks allowlist coverage', () => {
  it('still detects a literal secret-like value despite the env-backed allowlist', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      console.warn('gitleaks binary not found; skipping runtime detection assertion');
      return;
    }
    // Built at runtime so the committed test file contains no contiguous secret-like literal.
    const hexChars = '0123456789abcdef';
    const secretValue = Array.from(
      { length: 32 },
      (_, index) => hexChars[index % hexChars.length],
    ).join('');
    const { findings } = runGitleaksOnContent(
      'process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;\n' +
        `const api_key = "${secretValue}";\n`,
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((finding) => finding.includes('sample.ts:2'))).toBe(true);
  });

  it('allows documented database-sync placeholders', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      console.warn('gitleaks binary not found; skipping runtime detection assertion');
      return;
    }
    const passwordPlaceholder = ['your', 'db-password'].join('-');
    const projectPlaceholder = ['your', 'dev-project-ref'].join('-');
    const { findings } = runGitleaksOnContent(
      `SUPABASE_DB_PASSWORD=${passwordPlaceholder} SUPABASE_PROJECT_REF=${projectPlaceholder}\n`,
    );
    expect(findings).toEqual([]);
  });

  it('does not flag expression values that merely follow a secret-named key', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      throw new Error('gitleaks binary required for allowlist regression');
    }
    // `(` and `.` start code constructs, not literals, so an identifier that
    // follows a secret-named key must not be mistaken for a secret value.
    const { findings } = runGitleaksOnContent(
      [
        'const env = {',
        '  PGPASSWORD: decodeURIComponent(url.password),',
        '  PASSWORD: encryptionKeyValue.password,',
        '};',
        '',
      ].join('\n'),
    );
    expect(findings).toEqual([]);
  });

  it('reports the literal value rather than the keyword for detected assignments', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      throw new Error('gitleaks binary required for allowlist regression');
    }
    // Built at runtime so the committed test file contains no contiguous secret-like literal.
    const hexChars = '0123456789abcdef';
    const literalSecret = Array.from(
      { length: 32 },
      (_, index) => hexChars[index % hexChars.length],
    ).join('');
    const { findings, secrets } = runGitleaksOnContent(`const api_key = '${literalSecret}';\n`);
    expect(findings.length).toBeGreaterThan(0);
    expect(secrets).toContain(literalSecret);
  });

  it('still detects environment-style and object-literal secrets', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      throw new Error('gitleaks binary required for allowlist regression');
    }
    const envSecret = ['super', 'secret', 'password', '123456'].join('');
    const envFindings = runGitleaksOnContent(`SUPABASE_DB_PASSWORD=${envSecret}\n`).findings;
    expect(envFindings.length).toBeGreaterThan(0);

    const objectSecret = ['abcdefgh', '12345678'].join('');
    const objectFindings = runGitleaksOnContent(
      `const config = { TOKEN: '${objectSecret}' };\n`,
    ).findings;
    expect(objectFindings.length).toBeGreaterThan(0);
  });

  it('still detects a synthetic private secret placed in the same tracked wrangler config', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      console.warn('gitleaks binary not found; skipping runtime detection assertion');
      return;
    }
    // Synthetic live-secret-shaped values that are NOT in any allowlist.
    const syntheticStripeSecret = ['whsec_', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'].join('');
    const syntheticServiceRoleJwt = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.',
      'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bnRoZXRpY3JlZjAwMDAwMDAwMDAiLCJyb2xlIjoic2VydmljZV9yb2xlIn0.',
      'c3ludGhldGljc2VjcmV0c2lnbmF0dXJlZm9ycmVncmVzc2lvbnRlc3Q=',
    ].join('');
    const content = [
      `{`,
      `  "vars": {`,
      `    "STRIPE_WEBHOOK_SECRET": "${syntheticStripeSecret}",`,
      `    "SUPABASE_SERVICE_ROLE_KEY": "${syntheticServiceRoleJwt}",`,
      `  },`,
      `}`,
      '',
    ].join('\n');
    const { findings } = runGitleaksOnContent(content, 'wrangler.container-production.jsonc');
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does not flag the verified public values in the production Wrangler config', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      throw new Error('gitleaks binary required for allowlist regression');
    }
    const config = fs.readFileSync(
      path.join(process.cwd(), 'wrangler.container-production.jsonc'),
      'utf8',
    );
    const { findings, exitCode } = runGitleaksOnContent(
      config,
      'wrangler.container-production.jsonc',
    );
    expect(exitCode).toBe(0);
    expect(findings).toEqual([]);
  });

  it('detects a private secret beside an allowlisted public value on the same line', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      throw new Error('gitleaks binary required for allowlist regression');
    }
    const config = fs.readFileSync(
      path.join(process.cwd(), 'wrangler.container-production.jsonc'),
      'utf8',
    );
    const publicKey = config.match(/"NEXT_PUBLIC_POSTHOG_KEY"\s*:\s*"([^"]+)"/)?.[1];
    if (!publicKey) throw new Error('production PostHog public key missing from Wrangler config');
    const privateSecret = ['whsec_', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'].join('');
    const content = `{"vars":{"NEXT_PUBLIC_POSTHOG_KEY":"${publicKey}","STRIPE_WEBHOOK_SECRET":"${privateSecret}"}}\n`;
    const { secrets } = runGitleaksOnContent(content, 'wrangler.container-production.jsonc');
    expect(secrets).toContain(privateSecret);
  });

  it('detects a second Supabase URL beside the allowlisted public URL on the same line', () => {
    if (!fs.existsSync(GITLEAKS_BIN)) {
      throw new Error('gitleaks binary required for allowlist regression');
    }
    const config = fs.readFileSync(
      path.join(process.cwd(), 'wrangler.container-production.jsonc'),
      'utf8',
    );
    const publicUrl = config.match(/"NEXT_PUBLIC_SUPABASE_URL"\s*:\s*"([^"]+)"/)?.[1];
    if (!publicUrl) throw new Error('production Supabase public URL missing from Wrangler config');
    const unexpectedUrl = `https://${'a'.repeat(20)}.supabase.co`;
    const content = `{"vars":{"NEXT_PUBLIC_SUPABASE_URL":"${publicUrl}","UNEXPECTED_SUPABASE_URL":"${unexpectedUrl}"}}\n`;
    const { secrets } = runGitleaksOnContent(content, 'wrangler.container-production.jsonc');
    expect(secrets).toContain(unexpectedUrl);
  });
});
