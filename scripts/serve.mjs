import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATIC_DIRECTORY = fileURLToPath(new URL('../dist/', import.meta.url));
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function isInside(directory, file) {
  const path = relative(directory, file);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** Local preview only. Production hosts serve dist/ directly. */
export async function createStaticServer(directory = STATIC_DIRECTORY) {
  const root = await realpath(directory);

  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    function sendError(status, message) {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : message);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      sendError(405, 'Method not allowed');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
    } catch {
      sendError(400, 'Invalid URL');
      return;
    }

    if (pathname.includes('\0') || pathname.includes('\\')) {
      sendError(400, 'Invalid path');
      return;
    }

    const candidate = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!pathname.startsWith('/') || !isInside(root, candidate)) {
      sendError(404, 'Not found');
      return;
    }

    try {
      const file = await realpath(candidate);
      if (!isInside(root, file) || !(await stat(file)).isFile()) {
        sendError(404, 'Not found');
        return;
      }

      const content = await readFile(file);
      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        'Content-Length': content.length,
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      const missing = ['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code);
      sendError(missing ? 404 : 500, missing ? 'Not found' : 'Unable to read file');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 8438);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Use a port between 1 and 65535: npm run dev -- 8438');
  }

  const server = await createStaticServer();
  server.on('error', (error) => {
    console.error(`Preview server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Crewd preview: http://127.0.0.1:${port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close());
  }
}
