import { createMotionController } from './motion.js?v=619bc6750a4a';

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
  const result = root.querySelector('.native-result');
  const buttons = [...root.querySelectorAll('[data-host]')];

  if (!label || !path || !description) return () => {};

  const motion = createMotionController(root);
  const handlers = buttons.map((button) => {
    function selectHost() {
      if (!Object.hasOwn(NATIVE_OUTPUTS, button.dataset.host)) return;
      if (button.getAttribute('aria-pressed') === 'true') return;
      const output = NATIVE_OUTPUTS[button.dataset.host];

      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      label.textContent = output.label;
      path.textContent = output.path;
      description.textContent = output.description;
      motion.play([
        {
          element: result,
          frames: [
            { transform: 'translateY(4px)', opacity: 0.4 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          duration: 220,
        },
      ]);
    }

    button.addEventListener('click', selectHost);
    return () => button.removeEventListener('click', selectHost);
  });

  return () => {
    motion.dispose();
    handlers.forEach((removeListener) => removeListener());
  };
}
