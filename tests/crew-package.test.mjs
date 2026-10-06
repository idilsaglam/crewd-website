import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { initCrewPackage } from '../dist/assets/crew-package.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));

function fixture(t, { reduced = false, motion = true } = {}) {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  const { window } = dom;
  const root = window.document.querySelector('[data-crew-package]');
  const records = [];
  const media = new window.EventTarget();
  media.matches = reduced;
  window.matchMedia = () => media;

  let observer;
  window.IntersectionObserver = class {
    constructor(callback) {
      this.notify = callback;
      observer = this;
    }
    observe(target) {
      this.target = target;
    }
    disconnect() {
      this.disconnected = true;
    }
  };

  if (motion)
    window.Element.prototype.animate = function () {
      let finish;
      const record = {
        target: this,
        finished: new Promise((resolve) => {
          finish = resolve;
        }),
        finish: () => finish(),
        cancel() {
          this.cancelled = true;
          finish();
        },
      };
      records.push(record);
      return record;
    };

  const dispose = initCrewPackage(root);
  t.after(dispose);
  return { window, root, media, records, observer, dispose };
}

test('crew package plays once on entry and keeps its contents visible afterwards', async (t) => {
  const { root, records, observer } = fixture(t);
  observer.notify([{ isIntersecting: true, intersectionRatio: 0.2 }]);
  assert.equal(records.length, 0);
  observer.notify([{ isIntersecting: true, intersectionRatio: 0.5 }]);
  assert.equal(root.dataset.packageState, 'unpacking');
  assert.ok(records.length > 0);
  assert.equal(observer.disconnected, true);
  records.forEach((animation) => animation.finish());
  await settle();
  assert.equal(root.dataset.packageState, 'ready');
  assert.equal(
    root.querySelector('[role="status"]').textContent,
    'Four agents and six skills in one package.',
  );
  const count = records.length;
  observer.notify([{ isIntersecting: false, intersectionRatio: 0 }]);
  observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
  assert.equal(records.length, count, 'Scrolling back must not restart the animation');
  assert.deepEqual(
    [...root.querySelectorAll('[data-package-role]')].map((role) => role.textContent),
    ['Architect', 'Implementer', 'Reviewer', 'Release notes'],
  );
});

test('crew package respects reduced motion before and during playback', async (t) => {
  const first = fixture(t, { reduced: true });
  first.observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
  assert.equal(first.records.length, 0);
  assert.equal(first.root.dataset.packageState, 'ready');

  const second = fixture(t);
  second.observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
  second.media.matches = true;
  second.media.dispatchEvent(new second.window.Event('change'));
  await settle();
  assert.ok(second.records.every((animation) => animation.cancelled));
  assert.equal(second.root.dataset.packageState, 'ready');
});

test('crew package remains usable without animation or observer APIs', (t) => {
  const { root, window, observer, dispose } = fixture(t, { motion: false });
  observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
  assert.equal(root.dataset.packageState, 'ready');
  assert.equal(root.querySelectorAll('[data-package-role]').length, 4);
  const details = root.querySelector('.package-inspect');
  details.open = true;
  assert.match(details.textContent, /crewd interview/);
  assert.match(details.textContent, /SKILL\.md/);
  dispose();
  delete window.IntersectionObserver;
  const stop = initCrewPackage(root);
  assert.equal(root.dataset.packageState, 'ready');
  stop();
  assert.doesNotThrow(() => initCrewPackage(null)());
});

test('crew package cancels motion on resize and detaches observers and listeners', async (t) => {
  const { root, window, records, observer } = fixture(t);
  observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
  window.dispatchEvent(new window.Event('resize'));
  await settle();
  assert.ok(records.every((animation) => animation.cancelled));
  assert.equal(root.dataset.packageState, 'ready');
  const second = fixture(t);
  second.observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
  const count = second.records.length;
  second.dispose();
  await settle();
  assert.equal(second.observer.disconnected, true);
  assert.ok(second.records.every((animation) => animation.cancelled));
  second.observer.notify([{ isIntersecting: true, intersectionRatio: 1 }]);
  second.window.dispatchEvent(new second.window.Event('resize'));
  assert.equal(second.records.length, count);
  assert.equal(second.root.dataset.packageState, 'ready');
});
