import { createMotionController, onceInView } from './motion.js?v=619bc6750a4a';

// These are illustrative packages from crewd.dev. This UI never executes CLI commands.
const INSTALL_EXAMPLES = {
  agent: {
    command: 'crewd hire @alice/reviewer',
    summary: '1 agent · 2 included skills · v1.4.2',
    agents: [
      {
        initial: 'R',
        name: 'Reviewer',
        detail: 'Agent + 2 skills',
        address: '@alice/reviewer@1.4.2',
        role: 'reviewer',
      },
    ],
    output: [
      { text: 'Ready for Claude Code, Cursor and Gemini CLI', marker: '✓' },
      { text: 'Package versions saved for your team', marker: '✓' },
    ],
  },
  team: {
    command: 'crewd hire team @acme/backend-squad',
    summary: '4 agents · 6 included skills',
    agents: [
      { initial: 'A', name: 'Architect', role: 'architect' },
      { initial: 'I', name: 'Implementer', role: 'implementer' },
      { initial: 'R', name: 'Reviewer', role: 'reviewer' },
      { initial: 'N', name: 'Release notes', role: 'release-notes' },
    ],
    output: [
      { text: 'Ready for Claude Code, Cursor and Gemini CLI', marker: '✓' },
      { text: 'Package versions saved for your team', marker: '✓' },
    ],
  },
};

function createAgentTile(document, agent) {
  const tile = document.createElement('div');
  tile.className = 'agent-tile';
  tile.dataset.role = agent.role;

  const initial = document.createElement('span');
  initial.className = 'agent-letter';
  initial.textContent = agent.initial;
  initial.setAttribute('aria-hidden', 'true');

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
    marker.setAttribute('aria-hidden', 'true');
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
  const command = root.querySelector('#hire-command');
  const crew = root.querySelector('#crew-display');
  const output = root.querySelector('#terminal-output');
  const replay = root.querySelector('[data-replay]');
  const summary = root.querySelector('#install-summary');
  const buttons = [...root.querySelectorAll('[data-mode]')];

  if (!command || !crew || !output || !replay) return () => {};

  const motion = createMotionController(root);
  let mode = 'team';

  function playInstallation() {
    const roles = [...crew.querySelectorAll('.agent-tile')];
    const confirmationDelay = 750 + roles.length * 180;
    motion.play([
      {
        element: command,
        frames: [{ opacity: 0 }, { opacity: 1 }],
        duration: 350,
      },
      ...roles.map((element, index) => ({
        element,
        frames: [
          { transform: 'translateY(14px) scale(.97)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ],
        delay: 350 + index * 180,
        duration: 600,
      })),
      ...[...output.children].map((element, index) => ({
        element,
        frames: [
          { transform: 'translateY(6px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        delay: confirmationDelay + index * 180,
        duration: 400,
      })),
    ]);
  }

  const stopAutoPlay = onceInView(root, playInstallation);

  function render(nextMode) {
    if (!Object.hasOwn(INSTALL_EXAMPLES, nextMode)) return;
    stopAutoPlay();
    motion.cancel();
    const example = INSTALL_EXAMPLES[nextMode];

    mode = nextMode;
    buttons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    command.textContent = example.command;
    if (summary) summary.textContent = example.summary;
    crew.classList.toggle('is-team', mode === 'team');
    crew.replaceChildren(...example.agents.map((agent) => createAgentTile(document, agent)));
    output.replaceChildren(...example.output.map((entry) => createOutputLine(document, entry)));
    playInstallation();
  }

  const handlers = buttons.map((button) => {
    const handler = () => render(button.dataset.mode);
    button.addEventListener('click', handler);
    return () => button.removeEventListener('click', handler);
  });

  function replayExample() {
    render(mode);
  }

  replay.addEventListener('click', replayExample);

  return () => {
    stopAutoPlay();
    motion.dispose();
    handlers.forEach((removeListener) => removeListener());
    replay.removeEventListener('click', replayExample);
  };
}
