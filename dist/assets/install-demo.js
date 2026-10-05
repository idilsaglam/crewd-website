// These are illustrative packages from crewd.dev. This UI never executes CLI commands.
const INSTALL_EXAMPLES = {
  agent: {
    command: 'crewd hire @alice/reviewer',
    agents: [
      {
        initial: 'R',
        name: 'Reviewer',
        detail: 'Agent + 2 skills',
        address: '@alice/reviewer@1.4.2',
      },
    ],
    output: [
      { text: 'Resolving package and skills…', muted: true },
      { text: '.claude/agents/reviewer.md', marker: '✓' },
      { text: '.cursor/rules/crewd-reviewer.mdc', marker: '✓' },
      { text: 'GEMINI.md', marker: '✓', detail: 'section added' },
    ],
  },
  team: {
    command: 'crewd hire team @acme/backend-squad',
    agents: [
      { initial: 'A', name: 'Architect' },
      { initial: 'I', name: 'Implementer' },
      { initial: 'R', name: 'Reviewer' },
      { initial: 'N', name: 'Release notes' },
    ],
    output: [
      { text: 'Hired: architect, implementer, reviewer, release-notes', marker: '✓' },
      { text: 'Compiled for Claude Code, Cursor and Gemini CLI', marker: '✓' },
      { text: 'Scripts detected — run crewd interview to review', marker: '!' },
    ],
  },
};

function createAgentTile(document, agent) {
  const tile = document.createElement('div');
  tile.className = 'agent-tile';

  const initial = document.createElement('span');
  initial.className = 'agent-letter';
  initial.textContent = agent.initial;

  const content = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = agent.name;
  content.append(name);

  if (agent.detail) {
    const detail = document.createElement('span');
    detail.textContent = agent.detail;
    content.append(detail);
  }

  tile.append(initial, content);

  if (agent.address) {
    const address = document.createElement('span');
    address.className = 'package-address';
    address.textContent = agent.address;
    tile.append(address);
  }

  return tile;
}

function createOutputLine(document, entry) {
  const line = document.createElement('div');
  line.className = entry.muted ? 'terminal-line muted' : 'terminal-line';

  if (entry.marker) {
    const marker = document.createElement('span');
    marker.className = 'check';
    marker.textContent = entry.marker;
    line.append(marker);
  }

  const text = document.createElement(entry.muted ? 'span' : 'code');
  text.textContent = entry.text;
  line.append(text);

  if (entry.detail) {
    const detail = document.createElement('span');
    detail.className = 'muted';
    detail.textContent = entry.detail;
    line.append(detail);
  }

  return line;
}

/** Enhance the static installation example. Return a disposer for tests or partial-page removal. */
export function initInstallDemo(root) {
  if (!root) return () => {};

  const document = root.ownerDocument;
  const window = document.defaultView;
  const command = root.querySelector('#hire-command');
  const crew = root.querySelector('#crew-display');
  const output = root.querySelector('#terminal-output');
  const replay = root.querySelector('[data-replay]');
  const buttons = [...root.querySelectorAll('[data-mode]')];

  if (!command || !crew || !output || !replay) return () => {};

  let mode = 'agent';

  function render(nextMode) {
    if (!Object.hasOwn(INSTALL_EXAMPLES, nextMode)) return;
    const example = INSTALL_EXAMPLES[nextMode];

    mode = nextMode;
    buttons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    command.textContent = example.command;
    crew.classList.toggle('is-team', mode === 'team');
    crew.replaceChildren(...example.agents.map((agent) => createAgentTile(document, agent)));
    output.replaceChildren(...example.output.map((entry) => createOutputLine(document, entry)));
  }

  const handlers = buttons.map((button) => {
    const handler = () => render(button.dataset.mode);
    button.addEventListener('click', handler);
    return () => button.removeEventListener('click', handler);
  });

  function replayExample() {
    render(mode);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      crew.animate?.(
        [
          { transform: 'translateY(8px)', opacity: 0.5 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 450, easing: 'ease-out' },
      );
    }
  }

  replay.addEventListener('click', replayExample);

  return () => {
    handlers.forEach((removeListener) => removeListener());
    replay.removeEventListener('click', replayExample);
  };
}
