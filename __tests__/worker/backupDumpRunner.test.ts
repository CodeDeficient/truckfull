/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { Readable } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import { lineTransform, runPgDump } from '../../containers/backup/dumpPipeline.mjs';
import { transformSchemaLine } from '../../worker/backupDump.mjs';

async function collect(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function nodeArgs(script) {
  return ['node', '-e', script];
}

describe('runPgDump', () => {
  it('streams transformed lines through gzip into a buffer', async () => {
    const body = await runPgDump({
      args: nodeArgs('process.stdout.write("CREATE TABLE \\"public\\".\\"t\\" (\\n");process.stdout.write("-- comment\\n");'),
      pgEnv: {},
      onLine: transformSchemaLine,
    });

    const text = gunzipSync(body).toString('utf8');
    expect(text).toBe('CREATE TABLE IF NOT EXISTS "public"."t" (\n');
  });

  it('wraps the output with preamble and postamble', async () => {
    const body = await runPgDump({
      args: nodeArgs('process.stdout.write("INSERT INTO x;\\n");'),
      pgEnv: {},
      onLine: (line) => line,
      preamble: 'SET session_replication_role = replica;\n',
      postamble: '\nRESET ALL;\n',
    });

    expect(gunzipSync(body).toString('utf8')).toBe(
      'SET session_replication_role = replica;\nINSERT INTO x;\n\nRESET ALL;\n',
    );
  });

  it('rejects with the captured stderr when the command fails', async () => {
    await expect(
      runPgDump({
        args: nodeArgs('process.stderr.write("boom");process.exit(3);'),
        pgEnv: {},
        onLine: (line) => line,
      }),
    ).rejects.toThrow('pg_dump exited with 3: boom');
  });

  it('kills a command that exceeds its timeout and rejects', async () => {
    await expect(
      runPgDump({
        args: nodeArgs('setTimeout(() => {}, 60000);'),
        pgEnv: {},
        onLine: (line) => line,
        timeoutMs: 200,
      }),
    ).rejects.toThrow(/pg_dump exited/);
  });
});

describe('lineTransform', () => {
  it('preserves multi-byte characters split across chunk boundaries', async () => {
    const line = "INSERT INTO \"public\".\"t\" VALUES ('Café 日本語 🚚');\n";
    const bytes = Buffer.from(line, 'utf8');
    // Split inside the emoji so a partial sequence lands at a chunk edge.
    const splitAt = bytes.indexOf(Buffer.from('🚚', 'utf8')) + 2;
    const chunks = [bytes.subarray(0, splitAt), bytes.subarray(splitAt)];

    const output = await collect(Readable.from(chunks).pipe(lineTransform((value) => value)));
    expect(output.toString('utf8')).toBe(line);
    expect(output.toString('utf8')).not.toContain('\uFFFD');
  });

  it('preserves multi-byte characters when the stream is read one byte at a time', async () => {
    const line = "INSERT INTO \"public\".\"t\" VALUES ('naïve façade');\n";
    const bytes = [...Buffer.from(line, 'utf8')];

    const output = await collect(
      Readable.from(bytes.map((byte) => Buffer.from([byte]))).pipe(
        lineTransform((value) => value),
      ),
    );
    expect(output.toString('utf8')).toBe(line);
  });
});
