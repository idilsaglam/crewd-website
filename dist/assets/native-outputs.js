const NATIVE_OUTPUTS = {
  claude: {
    label: 'Native agent file',
    path: '.claude/agents/reviewer.md',
    description: 'Saved in Claude Code’s agents directory.',
  },
  cursor: {
    label: 'Native rule file',
    path: '.cursor/rules/crewd-reviewer.mdc',
    description: 'Saved as a Cursor rule.',
  },
  gemini: {
    label: 'Native instructions section',
    path: 'GEMINI.md',
    description: 'Added to your project’s GEMINI.md.',
  },
};

export function initNativeOutputs(root) {
  if (!root) return () => {};

  const label = root.querySelector('#native-label');
  const path = root.querySelector('#native-path');
  const description = root.querySelector('#native-description');
  const buttons = [...root.querySelectorAll('[data-host]')];

  if (!label || !path || !description) return () => {};

  const handlers = buttons.map((button) => {
    function selectHost() {
      if (!Object.hasOwn(NATIVE_OUTPUTS, button.dataset.host)) return;
      const output = NATIVE_OUTPUTS[button.dataset.host];

      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      label.textContent = output.label;
      path.textContent = output.path;
      description.textContent = output.description;
    }

    button.addEventListener('click', selectHost);
    return () => button.removeEventListener('click', selectHost);
  });

  return () => handlers.forEach((removeListener) => removeListener());
}
