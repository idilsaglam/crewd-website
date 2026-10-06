const COMPLETE_STATUS = 'Four agents and six skills in one package.';

/** Enhance the static package diagram without hiding its contents when motion is unavailable. */
export function initCrewPackage(root) {
  if (!root) return () => {};

  const window = root.ownerDocument.defaultView;
  const stage = root.querySelector('[data-package-stage]');
  const core = root.querySelector('[data-package-core]');
  const connections = root.querySelector('[data-package-connections]');
  const roles = [...root.querySelectorAll('[data-package-role]')];
  const sheets = [...root.querySelectorAll('[data-package-sheet]')];
  const status = root.querySelector('[data-package-status]');
  if (!window || !stage || !core || !connections || !roles.length) return () => {};

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let animations = [];
  let runId = 0;
  let hasPlayed = false;
  let disposed = false;
  let intersectionObserver;
  let resizeObserver;

  function announce(message) {
    if (status) status.textContent = message;
  }

  function stop() {
    runId++;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    root.dataset.packageState = 'ready';
  }

  function drawConnections() {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width) return;
    const origin = core.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - bounds.left;
    const y = origin.bottom - bounds.top;
    const targets = roles.map((role) => role.getBoundingClientRect());
    const firstRow = Math.min(...targets.map((target) => target.top));
    connections.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    connections.replaceChildren(
      ...targets.map((target) => {
        const endX = target.left + target.width / 2 - bounds.left;
        const endY = target.top + 18.5 - bounds.top;
        const path = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
        // Route the second row outside the first row's labels on narrow screens.
        if (target.top > firstRow + 20) {
          const wing = endX < x ? 8 : bounds.width - 8;
          path.setAttribute(
            'd',
            `M ${x} ${y} C ${x} ${y + 28}, ${wing} ${y + 28}, ${wing} ${y + 64} L ${wing} ${endY - 26} Q ${wing} ${endY}, ${endX} ${endY}`,
          );
        } else {
          path.setAttribute(
            'd',
            `M ${x} ${y} C ${x} ${y + 44}, ${endX} ${endY - 45}, ${endX} ${endY}`,
          );
        }
        return path;
      }),
    );
  }

  function play() {
    if (disposed) return;
    hasPlayed = true;
    intersectionObserver?.disconnect();
    stop();
    drawConnections();

    if (reducedMotion?.matches || typeof roles[0].animate !== 'function') {
      announce(COMPLETE_STATUS);
      return;
    }

    const currentRun = runId;
    const origin = core.getBoundingClientRect();
    root.dataset.packageState = 'unpacking';
    announce('Unpacking the example crew.');

    function animate(element, frames, delay = 0, duration = 950) {
      if (typeof element.animate !== 'function') return;
      animations.push(
        element.animate(frames, {
          duration,
          delay,
          easing: 'cubic-bezier(.2,.7,.2,1)',
          fill: 'backwards',
        }),
      );
    }

    try {
      roles.forEach((role, index) => {
        const target = role.getBoundingClientRect();
        const dx = origin.left + origin.width / 2 - target.left - target.width / 2;
        const dy = origin.top + origin.height / 2 - target.top - target.height / 2;
        animate(
          role,
          [
            { transform: `translate(${dx}px, ${dy}px) scale(.85)`, opacity: 0 },
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          ],
          index * 90,
        );
      });
      connections.querySelectorAll('path').forEach((path, index) => {
        if (typeof path.getTotalLength !== 'function') return;
        const length = path.getTotalLength();
        animate(
          path,
          [
            { strokeDasharray: `${length}`, strokeDashoffset: length },
            { strokeDasharray: `${length}`, strokeDashoffset: 0 },
          ],
          index * 90,
        );
      });
      sheets.forEach((sheet, index) =>
        animate(
          sheet,
          [
            { transform: 'translateY(24px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          350 + index * 60,
          700,
        ),
      );
    } catch {
      stop();
      announce(COMPLETE_STATUS);
      return;
    }

    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (disposed || currentRun !== runId) return;
      animations = [];
      root.dataset.packageState = 'ready';
      announce(COMPLETE_STATUS);
    });
  }

  function handleResize() {
    const wasPlaying = animations.length > 0;
    stop();
    drawConnections();
    if (wasPlaying) announce(COMPLETE_STATUS);
  }

  function handleMotionChange() {
    if (!reducedMotion.matches) return;
    stop();
    announce(COMPLETE_STATUS);
  }

  drawConnections();
  reducedMotion?.addEventListener?.('change', handleMotionChange);

  if (typeof window.ResizeObserver === 'function') {
    resizeObserver = new window.ResizeObserver(handleResize);
    resizeObserver.observe(stage);
  } else {
    window.addEventListener('resize', handleResize);
  }

  if (typeof window.IntersectionObserver === 'function') {
    intersectionObserver = new window.IntersectionObserver(
      (entries) => {
        if (
          !hasPlayed &&
          entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)
        )
          play();
      },
      { threshold: 0.35 },
    );
    intersectionObserver.observe(stage);
  }

  return () => {
    if (disposed) return;
    disposed = true;
    stop();
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleResize);
    reducedMotion?.removeEventListener?.('change', handleMotionChange);
    announce(COMPLETE_STATUS);
  };
}
