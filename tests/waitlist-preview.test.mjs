import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { initWaitlistPreview } from '../dist/assets/waitlist-preview.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

function fixture(t) {
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  t.after(() => dom.window.close());
  const form = dom.window.document.querySelector('[data-waitlist-form]');
  return {
    window: dom.window,
    form,
    email: form.querySelector('input'),
    button: form.querySelector('button'),
    status: form.querySelector('[data-waitlist-status]'),
    links: [...dom.window.document.querySelectorAll('[data-waitlist-link]')],
  };
}

function submit(window, form) {
  const event = new window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  return event;
}

test('valid preview submissions are intercepted without claiming registration or persisting an email', (t) => {
  const { window, form, email, button, status } = fixture(t);
  const dispose = initWaitlistPreview(form);
  t.after(dispose);
  assert.equal(button.disabled, false);
  email.value = 'preview@example.com';
  assert.ok(submit(window, form).defaultPrevented);
  assert.equal(status.textContent, 'Your email has not been submitted. This form is a preview.');
  assert.equal(window.localStorage.length, 0);
  assert.equal(window.sessionStorage.length, 0);
  assert.equal(window.location.href, 'http://localhost/');
});

test('empty and invalid email submissions stay blocked without preview confirmation', (t) => {
  const { window, form, email, status } = fixture(t);
  t.after(initWaitlistPreview(form));
  for (const value of ['', 'invalid-email']) {
    email.value = value;
    assert.ok(submit(window, form).defaultPrevented);
    assert.equal(status.textContent, '');
    assert.equal(email.validity.valid, false);
  }
});

test('CTA links focus the email field, and editing clears stale preview feedback', async (t) => {
  const { window, form, email, status, links } = fixture(t);
  t.after(initWaitlistPreview(form));
  for (const link of links) {
    link.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(window.document.activeElement, email);
  }
  email.value = 'preview@example.com';
  submit(window, form);
  assert.ok(status.textContent);
  email.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(status.textContent, '');
});

test('preview cleanup disables submission and detaches event listeners', async (t) => {
  const { window, form, email, button, status, links } = fixture(t);
  const dispose = initWaitlistPreview(form);
  links[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  dispose();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  assert.notEqual(window.document.activeElement, email);
  assert.ok(button.disabled);
  email.value = 'preview@example.com';
  submit(window, form);
  assert.equal(status.textContent, '');
  assert.doesNotThrow(() => initWaitlistPreview(null)());
});
