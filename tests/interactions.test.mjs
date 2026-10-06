import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { initInstallDemo } from '../dist/assets/install-demo.js';
import { initNativeOutputs } from '../dist/assets/native-outputs.js';
import { initCommandCopy } from '../dist/assets/command-copy.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

function fixture(t) {
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  t.after(() => dom.window.close());
  const document = dom.window.document;
  return {
    window: dom.window,
    document,
    install: document.querySelector('[data-install-demo]'),
    native: document.querySelector('[data-native-demo]'),
    copy: document.querySelector('[data-command-copy]'),
  };
}

function selectedButtons(root, attribute) {
  return [...root.querySelectorAll(`[${attribute}][aria-pressed="true"]`)];
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('install demo switches team and agent commands, output and pressed state together', (t) => {
  const { document, install } = fixture(t);
  initInstallDemo(install);

  assert.equal(
    document.querySelector('#hire-command').textContent,
    'crewd hire team @acme/backend-squad',
  );
  assert.deepEqual(
    [...install.querySelectorAll('.agent-tile strong')].map((node) => node.textContent),
    ['Architect', 'Implementer', 'Reviewer', 'Release notes'],
  );
  assert.equal(selectedButtons(install, 'data-mode').length, 1);
  assert.equal(selectedButtons(install, 'data-mode')[0].dataset.mode, 'team');
  assert.match(document.querySelector('#terminal-output').textContent, /Package versions saved/);
  assert.equal(
    document.querySelector('#install-summary').textContent,
    '4 agents · 6 included skills',
  );

  install.querySelector('[data-mode="agent"]').click();
  assert.equal(install.querySelectorAll('.agent-tile').length, 1);
  assert.equal(document.querySelector('#hire-command').textContent, 'crewd hire @alice/reviewer');
  assert.match(
    document.querySelector('#terminal-output').textContent,
    /Claude Code, Cursor and Gemini CLI/,
  );
  assert.equal(selectedButtons(install, 'data-mode')[0].dataset.mode, 'agent');
  assert.equal(
    document.querySelector('#install-summary').textContent,
    '1 agent · 2 included skills · v1.4.2',
  );

  install.querySelector('[data-mode="team"]').click();
  assert.equal(install.querySelectorAll('.agent-tile').length, 4);
  assert.match(document.querySelector('#terminal-output').textContent, /Package versions saved/);
});

test('replay preserves the current mode and respects reduced motion', (t) => {
  const { window, install } = fixture(t);
  let animations = 0;
  let reducedMotion = false;
  window.matchMedia = () => ({
    get matches() {
      return reducedMotion;
    },
  });
  window.Element.prototype.animate = () => {
    animations++;
    return { finished: Promise.resolve(), cancel() {} };
  };
  initInstallDemo(install);
  install.querySelector('[data-mode="team"]').click();
  const beforeReplay = animations;
  install.querySelector('[data-replay]').click();
  assert.equal(install.querySelectorAll('.agent-tile').length, 4);
  assert.ok(animations > beforeReplay);
  const afterReplay = animations;
  reducedMotion = true;
  install.querySelector('[data-replay]').click();
  assert.equal(animations, afterReplay);
});

test('install controls work when animation APIs are unavailable and detach cleanly', (t) => {
  const { install } = fixture(t);
  const dispose = initInstallDemo(install);
  install.querySelector('[data-replay]').click();
  assert.equal(install.querySelectorAll('.agent-tile').length, 4);
  dispose();
  install.querySelector('[data-mode="agent"]').click();
  assert.equal(install.querySelectorAll('.agent-tile').length, 4);
});

test('native output controls show each tool’s path and select a single button', (t) => {
  const { native } = fixture(t);
  const dispose = initNativeOutputs(native);
  const expected = [
    ['cursor', '.cursor/rules/crewd-reviewer.mdc', 'Saved as a Cursor rule.'],
    ['gemini', 'GEMINI.md', 'Added to your project’s GEMINI.md.'],
    ['claude', '.claude/agents/reviewer.md', 'Saved in Claude Code’s agents directory.'],
  ];
  for (const [host, path, description] of expected) {
    native.querySelector(`[data-host="${host}"]`).click();
    assert.equal(native.querySelector('#native-path').textContent, path);
    assert.equal(native.querySelector('#native-description').textContent, description);
    assert.equal(selectedButtons(native, 'data-host').length, 1);
    assert.equal(selectedButtons(native, 'data-host')[0].dataset.host, host);
  }
  dispose();
  native.querySelector('[data-host="cursor"]').click();
  assert.equal(native.querySelector('#native-path').textContent, expected[2][1]);
});

test('copy uses the currently selected command and announces success', async (t) => {
  const { window, install, copy } = fixture(t);
  const values = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: async (value) => values.push(value) },
  });
  initInstallDemo(install);
  initCommandCopy(copy);
  install.querySelector('[data-mode="agent"]').click();
  copy.querySelector('[data-copy]').click();
  await settle();
  assert.deepEqual(values, ['crewd hire @alice/reviewer']);
  assert.equal(copy.querySelector('[data-copy]').textContent, 'Copied');
  assert.equal(copy.querySelector('[role="status"]').textContent, 'Command copied to clipboard.');
});

for (const clipboard of ['missing', 'rejected']) {
  test(`copy selects the command when clipboard access is ${clipboard}`, async (t) => {
    const { window, copy } = fixture(t);
    if (clipboard === 'rejected') {
      Object.defineProperty(window.navigator, 'clipboard', {
        value: {
          writeText: async () => {
            throw new Error('Permission denied');
          },
        },
      });
    }
    initCommandCopy(copy);
    copy.querySelector('[data-copy]').click();
    await settle();
    assert.equal(window.getSelection().toString(), 'crewd hire team @acme/backend-squad');
    assert.equal(copy.querySelector('[data-copy]').textContent, 'Select command');
    assert.match(copy.querySelector('[role="status"]').textContent, /Command selected/);
  });
}

test('an older clipboard result cannot overwrite the latest result', async (t) => {
  const { window, copy } = fixture(t);
  const requests = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    value: {
      writeText: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    },
  });
  initCommandCopy(copy);
  const button = copy.querySelector('[data-copy]');
  button.click();
  button.click();
  requests[1].reject(new Error('Permission denied'));
  await settle();
  requests[0].resolve();
  await settle();
  assert.equal(button.textContent, 'Select command');
  assert.match(copy.querySelector('[role="status"]').textContent, /Command selected/);
});

test('copy disposal ignores pending clipboard results', async (t) => {
  const { window, copy } = fixture(t);
  let complete;
  Object.defineProperty(window.navigator, 'clipboard', {
    value: {
      writeText: () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    },
  });
  const dispose = initCommandCopy(copy);
  copy.querySelector('[data-copy]').click();
  dispose();
  complete();
  await settle();
  assert.equal(copy.querySelector('[data-copy]').textContent.trim(), 'Copy');
  assert.equal(copy.querySelector('[role="status"]').textContent, '');
});

test('copy feedback resets and its timer is cancelled on disposal', async (t) => {
  const { window, copy } = fixture(t);
  Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async () => {} } });
  let reset;
  let cleared;
  window.setTimeout = (callback) => {
    reset = callback;
    return 7;
  };
  window.clearTimeout = (id) => {
    cleared = id;
  };
  const dispose = initCommandCopy(copy);
  const button = copy.querySelector('[data-copy]');
  button.click();
  await settle();
  assert.equal(button.textContent, 'Copied');
  reset();
  assert.equal(button.textContent, 'Copy');
  dispose();
  assert.equal(cleared, 7);
});

test('enhancements safely skip missing optional page sections', () => {
  for (const initialize of [initInstallDemo, initNativeOutputs, initCommandCopy]) {
    assert.doesNotThrow(() => initialize(null)());
  }
});
