import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { initInstallDemo } from '../dist/assets/install-demo.js';
import { initNativeOutputs } from '../dist/assets/native-outputs.js';
import { initWorkflowMotion } from '../dist/assets/workflow-motion.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));

function fixture(t, { reduced = false, wide = true, supported = true } = {}) {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  const { window } = dom;
  const media = new window.EventTarget();
  media.matches = reduced;
  window.matchMedia = (query) => (query.includes('reduced-motion') ? media : { matches: wide });
  const observers = [];
  window.IntersectionObserver = class {
    constructor(callback) {
      this.notify = callback;
      observers.push(this);
    }
    observe(target) {
      this.target = target;
    }
    disconnect() {
      this.disconnected = true;
    }
  };
  const animations = [];
  if (supported)
    window.Element.prototype.animate = function (frames, options) {
      let finish;
      let reject;
      const animation = {
        element: this,
        options,
        finished: new Promise((resolve, fail) => {
          finish = resolve;
          reject = fail;
        }),
        finish,
        cancel() {
          this.cancelled = true;
          reject(new window.DOMException('Cancelled', 'AbortError'));
        },
      };
      animations.push(animation);
      return animation;
    };
  return { window, document: window.document, media, observers, animations };
}

function enter(observer) {
  observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
}

test('hero plays command, roles and confirmation once on entry, then keeps the final content', async (t) => {
  const { document, observers, animations } = fixture(t);
  const root = document.querySelector('[data-install-demo]');
  t.after(initInstallDemo(root));
  assert.equal(animations.length, 0);
  observers[0].notify([{ isIntersecting: true, intersectionRatio: 0.1 }]);
  assert.equal(animations.length, 0);
  enter(observers[0]);
  assert.equal(root.dataset.motionState, 'playing');
  assert.equal(observers[0].disconnected, true);
  const command = animations.find((item) => item.element.id === 'hire-command');
  const roles = animations.filter((item) => item.element.matches('.agent-tile'));
  const confirmations = animations.filter((item) => item.element.matches('.terminal-line'));
  assert.equal(roles.length, 4);
  assert.equal(confirmations.length, 2);
  assert.ok(roles.every((item) => item.options.delay > command.options.delay));
  assert.ok(confirmations[0].options.delay > roles.at(-1).options.delay);
  assert.ok(animations.every((item) => item.options.delay + item.options.duration <= 3000));
  animations.forEach((item) => item.finish());
  await settle();
  assert.equal(root.dataset.motionState, 'ready');
  const count = animations.length;
  enter(observers[0]);
  assert.equal(animations.length, count);
  assert.equal(root.querySelectorAll('.agent-tile').length, 4);
  assert.match(root.querySelector('#terminal-output').textContent, /Package versions saved/);
});

test('rapid hero switches cancel the previous sequence and reduced motion stops the current one', async (t) => {
  const { document, observers, animations, window, media } = fixture(t);
  const root = document.querySelector('[data-install-demo]');
  const dispose = initInstallDemo(root);
  t.after(dispose);
  enter(observers[0]);
  const first = [...animations];
  root.querySelector('[data-mode="agent"]').click();
  assert.ok(first.every((item) => item.cancelled));
  await settle();
  assert.equal(
    root.dataset.motionState,
    'playing',
    'An old completion must not finish the new run',
  );
  assert.equal(root.querySelectorAll('.agent-tile').length, 1);
  assert.equal(root.querySelector('#hire-command').textContent, 'crewd hire @alice/reviewer');
  media.matches = true;
  media.dispatchEvent(new window.Event('change'));
  assert.equal(root.dataset.motionState, 'ready');
  const count = animations.length;
  root.querySelector('[data-mode="team"]').click();
  assert.equal(animations.length, count);
  assert.equal(root.querySelectorAll('.agent-tile').length, 4);
  dispose();
  enter(observers[0]);
  root.querySelector('[data-mode="agent"]').click();
  assert.equal(animations.length, count);
  assert.equal(root.querySelectorAll('.agent-tile').length, 4);
});

test('tool switches stay responsive while transitions are interrupted or motion is disabled', async (t) => {
  const { document, animations, media, window } = fixture(t);
  const root = document.querySelector('[data-native-demo]');
  t.after(initNativeOutputs(root));
  root.querySelector('[data-host="cursor"]').click();
  const first = animations[0];
  root.querySelector('[data-host="gemini"]').click();
  assert.equal(first.cancelled, true);
  assert.equal(root.querySelector('#native-path').textContent, 'GEMINI.md');
  await settle();
  assert.equal(root.dataset.motionState, 'playing');
  animations.at(-1).finish();
  await settle();
  assert.equal(root.dataset.motionState, 'ready');
  const count = animations.length;
  root.querySelector('[data-host="gemini"]').click();
  assert.equal(animations.length, count, 'Selecting the active host does not restart motion');
  media.matches = true;
  media.dispatchEvent(new window.Event('change'));
  root.querySelector('[data-host="claude"]').click();
  assert.equal(animations.length, count);
  assert.equal(root.querySelector('#native-path').textContent, '.claude/agents/reviewer.md');
});

test('desktop workflow reveals steps in order, plays once and cancels on disposal', (t) => {
  const { document, observers, animations } = fixture(t);
  const root = document.querySelector('.workflow-section');
  const dispose = initWorkflowMotion(root);
  t.after(dispose);
  observers.forEach(enter);
  assert.equal(animations.length, 3);
  assert.ok(animations[0].options.delay < animations[1].options.delay);
  assert.ok(animations[1].options.delay < animations[2].options.delay);
  observers.forEach(enter);
  assert.equal(animations.length, 3);
  dispose();
  assert.ok(animations.every((item) => item.cancelled));
  assert.ok(observers.every((observer) => observer.disconnected));
});

test('mobile workflow waits for each step to enter view without delaying it', (t) => {
  const { document, observers, animations } = fixture(t, { wide: false });
  t.after(initWorkflowMotion(document.querySelector('.workflow-section')));
  enter(observers[0]);
  assert.equal(animations.length, 1);
  assert.equal(observers[1].disconnected, undefined);
  enter(observers[1]);
  assert.equal(animations.length, 2);
  assert.ok(animations.every((item) => item.options.delay === 0));
});

for (const mode of ['reduced', 'unsupported', 'failed']) {
  test(`motion keeps content and controls usable when animations are ${mode}`, (t) => {
    const { document, observers, animations, window } = fixture(t, {
      reduced: mode === 'reduced',
      supported: mode !== 'unsupported',
    });
    if (mode === 'failed')
      window.Element.prototype.animate = () => {
        throw new Error('Animation unavailable');
      };
    const install = document.querySelector('[data-install-demo]');
    const native = document.querySelector('[data-native-demo]');
    t.after(initInstallDemo(install));
    t.after(initNativeOutputs(native));
    t.after(initWorkflowMotion(document.querySelector('.workflow-section')));
    observers.forEach(enter);
    install.querySelector('[data-mode="agent"]').click();
    native.querySelector('[data-host="cursor"]').click();
    assert.equal(animations.length, 0);
    assert.equal(install.dataset.motionState, 'ready');
    assert.equal(install.querySelectorAll('.agent-tile').length, 1);
    assert.equal(
      native.querySelector('#native-path').textContent,
      '.cursor/rules/crewd-reviewer.mdc',
    );
    assert.equal(document.querySelectorAll('.workflow-steps article').length, 3);
  });
}
