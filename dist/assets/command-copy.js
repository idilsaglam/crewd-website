function selectCommand(window, command) {
  const selection = window.getSelection();
  if (!selection) return false;

  const range = command.ownerDocument.createRange();
  range.selectNodeContents(command);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export function initCommandCopy(root) {
  if (!root) return () => {};

  const window = root.ownerDocument.defaultView;
  const button = root.querySelector('[data-copy]');
  const command = root.querySelector('code');
  const status = root.querySelector('[data-copy-status]');
  if (!button || !command) return () => {};

  let resetTimer;
  let requestId = 0;

  function announce(message) {
    if (status) status.textContent = message;
  }

  async function copyCommand() {
    const currentRequest = ++requestId;
    window.clearTimeout(resetTimer);
    const value = command.textContent.trim();

    try {
      if (!window.navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await window.navigator.clipboard.writeText(value);
      if (currentRequest !== requestId) return;

      button.textContent = 'Copied';
      announce('Command copied to clipboard.');
      resetTimer = window.setTimeout(() => {
        button.textContent = 'Copy';
      }, 1800);
    } catch {
      if (currentRequest !== requestId) return;

      const selected = selectCommand(window, command);
      button.textContent = 'Select command';
      announce(
        selected
          ? 'Command selected. Use your keyboard to copy it.'
          : 'Select and copy the command manually.',
      );
    }
  }

  button.addEventListener('click', copyCommand);

  return () => {
    requestId += 1;
    window.clearTimeout(resetTimer);
    button.removeEventListener('click', copyCommand);
  };
}
