import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createStaticServer } from '../scripts/serve.mjs';

function get(server, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request(
      { hostname: '127.0.0.1', port: server.address().port, path, method },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
        response.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function preview(t, directory) {
  const server = await createStaticServer(directory);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  return server;
}

test('preview serves HTML and modules with correct headers and HEAD behavior', async (t) => {
  const server = await preview(t);
  const page = await get(server, '/');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /text\/html/);
  assert.equal(page.headers['cache-control'], 'no-store');
  assert.match(page.body, /Add an AI crew/);
  const module = await get(server, '/assets/main.js?v=1');
  assert.equal(module.status, 200);
  assert.match(module.headers['content-type'], /text\/javascript/);
  const head = await get(server, '/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal(head.headers['content-length'], page.headers['content-length']);
});

test('preview rejects unsupported methods, malformed paths and files outside dist', async (t) => {
  const server = await preview(t);
  assert.equal((await get(server, '/', 'POST')).status, 405);
  assert.equal((await get(server, '/%zz')).status, 400);
  assert.equal((await get(server, '/%00')).status, 400);
  for (const path of [
    '/../package.json',
    '/%2e%2e/package.json',
    '/package.json',
    '/.git/config',
    '/assets/',
  ]) {
    assert.equal((await get(server, path)).status, 404, path);
  }
});

test('preview cannot serve a symlink pointing outside its static directory', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'crewd-preview-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, 'dist');
  await mkdir(root);
  await writeFile(join(directory, 'private.txt'), 'not public');
  await symlink(join(directory, 'private.txt'), join(root, 'linked.txt'));
  const server = await preview(t, root);
  assert.equal((await get(server, '/linked.txt')).status, 404);
});
