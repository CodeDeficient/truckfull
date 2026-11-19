import { spawn } from 'node:child_process';
import { createGzip } from 'node:zlib';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import {
  DATA_POSTAMBLE,
  DATA_PREAMBLE,
  buildDataDumpArgs,
  buildPgEnv,
  buildSchemaDumpArgs,
  transformDataLine,
  transformSchemaLine,
} from '../../worker/backupDump.mjs';
import { createBridgeClient } from './r2Bridge.mjs';

export const GZIP_LEVEL = 9;
export const PG_DUMP_TIMEOUT_MS = 20 * 60 * 1000;
// The Worker R2 bridge carries the compressed artifact in a single request body.
// Cloudflare's free plan caps request bodies at 100 MB; refuse early with a clear
// error instead of failing mid-upload once the dataset outgrows that boundary.
export const MAX_ARTIFACT_BYTES = 95 * 1024 * 1024;

export function lineTransform(onLine) {
  let buffered = '';
  // Decode through StringDecoder so a multi-byte character split across a chunk
  // boundary is reassembled instead of being replaced with U+FFFD. Dump data
  // contains user text with accents and emoji, which --column-inserts emits
  // verbatim, so naive per-chunk toString would silently corrupt values.
  const decoder = new StringDecoder('utf8');
  return new Transform({
    transform(chunk, _encoding, callback) {
      buffered += decoder.write(chunk);
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        const transformed = onLine(line);
        if (transformed !== null) this.push(`${transformed}\n`);
      }
      callback();
    },
    flush(callback) {
      buffered += decoder.end();
      if (buffered.length > 0) {
        const transformed = onLine(buffered);
        if (transformed !== null) this.push(transformed);
      }
      callback();
    },
  });
}

function wrapTransform(preamble, postamble) {
  let started = false;
  return new Transform({
    transform(chunk, _encoding, callback) {
      if (!started) {
        this.push(preamble);
        started = true;
      }
      this.push(chunk);
      callback();
    },
    flush(callback) {
      if (!started) this.push(preamble);
      this.push(postamble);
      callback();
    },
  });
}

async function collectToBuffer(stream) {
  const chunks = [];
  await pipeline(
    stream,
    new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    }),
  );
  return Buffer.concat(chunks);
}

export async function runPgDump({
  args,
  pgEnv,
  onLine,
  preamble = '',
  postamble = '',
  timeoutMs = PG_DUMP_TIMEOUT_MS,
}) {
  const child = spawn(args[0], args.slice(1), {
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...pgEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const guard = setTimeout(() => {
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
  }, timeoutMs);

  try {
    const [body] = await Promise.all([
      collectToBuffer(
        child.stdout
          .pipe(wrapTransform(preamble, postamble))
          .pipe(lineTransform(onLine))
          .pipe(createGzip({ level: GZIP_LEVEL })),
      ),
      new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pg_dump exited with ${code}: ${stderr.slice(0, 500)}`));
        });
      }),
    ]);
    if (body.length > MAX_ARTIFACT_BYTES) {
      throw new Error(
        `Compressed artifact is ${body.length} bytes, above the ${MAX_ARTIFACT_BYTES}-byte bridge limit`,
      );
    }
    return body;
  } finally {
    clearTimeout(guard);
  }
}

export function produceDumpsFromDatabase(dbUrl) {
  const pgEnv = buildPgEnv(dbUrl);
  return {
    produceSchema: () =>
      runPgDump({
        args: buildSchemaDumpArgs(),
        pgEnv,
        onLine: transformSchemaLine,
      }),
    produceData: () =>
      runPgDump({
        args: buildDataDumpArgs(),
        pgEnv,
        onLine: transformDataLine,
        preamble: DATA_PREAMBLE,
        postamble: DATA_POSTAMBLE,
      }),
  };
}

export async function sha256OfBuffer(buffer) {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

export function createBackupRunner(env) {
  if (!env.PROD_DB_URL) throw new Error('PROD_DB_URL is required');
  const { produceSchema, produceData } = produceDumpsFromDatabase(env.PROD_DB_URL);
  const bridge = createBridgeClient(env.R2_BRIDGE_URL ?? 'http://r2.bridge'); // eslint-disable-line sonarjs/no-clear-text-protocols -- internal loopback host of the containers runtime, not a network endpoint

  return {
    now: () => new Date(),
    produceSchema,
    produceData,
    sha256: sha256OfBuffer,
    upload: bridge.upload,
    head: bridge.head,
    list: bridge.list,
    deleteObjects: bridge.deleteObjects,
    log: (message) => console.log(`[backup] ${message}`),
  };
}
