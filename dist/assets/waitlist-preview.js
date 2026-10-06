/** Validate the frontend preview without sending or persisting the email address. */
export function initWaitlistPreview(form) {
  if (!form) return () => {};

  const email = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-waitlist-status]');
  if (!email || !button || !status) return () => {};

  const links = [...form.ownerDocument.querySelectorAll('[data-waitlist-link]')];
  const window = form.ownerDocument.defaultView;
  let focusTimer;

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    status.textContent = 'Your email has not been submitted. This form is a preview.';
  }

  function clearStatus() {
    status.textContent = '';
  }

  function focusEmail(event) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    window.clearTimeout(focusTimer);
    // Native fragment navigation runs after click listeners and can reset focus.
    focusTimer = window.setTimeout(() => {
      focusTimer = undefined;
      email.focus({ preventScroll: true });
    }, 0);
  }

  form.addEventListener('submit', handleSubmit);
  email.addEventListener('input', clearStatus);
  links.forEach((link) => link.addEventListener('click', focusEmail));
  // Keep the static form disabled until its no-transmission handler is attached.
  button.disabled = false;

  return () => {
    window.clearTimeout(focusTimer);
    button.disabled = true;
    form.removeEventListener('submit', handleSubmit);
    email.removeEventListener('input', clearStatus);
    links.forEach((link) => link.removeEventListener('click', focusEmail));
  };
}
