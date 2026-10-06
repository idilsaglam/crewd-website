import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const publicUrl = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', publicUrl), 'utf8');

test('the static document has valid IDs, in-page destinations and accessible controls', (t) => {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  const document = dom.window.document;
  const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
  assert.equal(document.querySelectorAll('h1').length, 1);
  assert.equal(document.documentElement.lang, 'en');
  for (const anchor of document.querySelectorAll('a[href^="#"]')) {
    assert.ok(document.getElementById(anchor.hash.slice(1)), `Missing anchor: ${anchor.hash}`);
  }
  for (const button of document.querySelectorAll('button')) {
    assert.ok(button.textContent.trim() || button.getAttribute('aria-label'));
    assert.equal(button.type, 'button');
  }
  for (const node of document.querySelectorAll('[aria-labelledby]')) {
    for (const id of node.getAttribute('aria-labelledby').split(/\s+/)) {
      assert.ok(document.getElementById(id), `Missing label: ${id}`);
    }
  }
  for (const anchor of document.querySelectorAll('a[target="_blank"]')) {
    assert.ok(anchor.rel.split(/\s+/).includes('noopener'));
  }
});

test('signup links retain the real waitlist destination', (t) => {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  const signup = [...dom.window.document.querySelectorAll('a')].filter(
    (anchor) => anchor.textContent.trim() === 'Join the beta waitlist',
  );
  assert.equal(signup.length, 3);
  assert.ok(signup.every((anchor) => anchor.href === 'https://crewd.dev/#cta-title'));
  assert.equal(dom.window.document.querySelectorAll('form').length, 0);
});

test('all HTML, CSS and module references resolve inside the deployable directory', async (t) => {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  const references = [...dom.window.document.querySelectorAll('script[src],link[href],img[src]')]
    .map((node) => node.getAttribute('src') ?? node.getAttribute('href'))
    .filter((value) => !/^(https?:|data:)/.test(value));
  const css = await readFile(new URL('assets/site.css', publicUrl), 'utf8');
  for (const [, asset] of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    references.push(`assets/${asset}`);
  }
  for (const reference of references) {
    const url = new URL(reference, publicUrl);
    assert.ok(fileURLToPath(url).startsWith(fileURLToPath(publicUrl)), reference);
    await access(url);
  }
  const main = await readFile(new URL('assets/main.js', publicUrl), 'utf8');
  for (const [, path] of main.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const url = new URL(path, new URL('assets/main.js', publicUrl));
    assert.ok(fileURLToPath(url).startsWith(fileURLToPath(publicUrl)), path);
    await access(url);
  }
  assert.equal(dom.window.document.querySelector('script').type, 'module');
});
