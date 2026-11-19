import { timingSafeEqual } from 'node:crypto';

function authorized(header, token) {
  if (!token || typeof header !== 'string') return false;
  const provided = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${token}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function createBackupHandler(run, token, onFailure = () => {}) {
  let status = 'idle';
  let running = false;

  return (request, response) => {
    response.setHeader('content-type', 'application/json');
    if (!authorized(request.headers.authorization, token)) {
      response.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/run' && pathname !== '/status') {
      response.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    if (
      (pathname === '/run' && request.method !== 'POST') ||
      (pathname === '/status' && request.method !== 'GET')
    ) {
      response.writeHead(405).end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    if (pathname === '/status') {
      response.writeHead(200).end(JSON.stringify({ status }));
      return;
    }
    if (running) {
      response.writeHead(409).end(JSON.stringify({ status }));
      return;
    }

    running = true;
    status = 'running';
    Promise.resolve()
      .then(run)
      .then((result) => {
        status = result.outcome;
      })
      .catch(async (error) => {
        status = 'failed';
        await onFailure(error);
      })
      .catch(() => {
        console.error('[backup] failure alert could not be sent');
      })
      .finally(() => {
        running = false;
      });
    response.writeHead(202).end(JSON.stringify({ status }));
  };
}
