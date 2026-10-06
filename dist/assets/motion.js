/** Keep short animations cancellable, with readable static content as the fallback. */
export function createMotionController(root) {
  const window = root.ownerDocument.defaultView;
  const preference = window?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let animations = [];
  let runId = 0;
  let disposed = false;

  function cancel() {
    runId++;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    root.dataset.motionState = 'ready';
  }

  function play(entries) {
    cancel();
    if (disposed || preference?.matches) return;
    const currentRun = runId;

    try {
      for (const { element, frames, delay = 0, duration = 500 } of entries) {
        if (typeof element?.animate !== 'function') continue;
        animations.push(
          element.animate(frames, {
            delay,
            duration,
            easing: 'cubic-bezier(.2,.7,.2,1)',
            fill: 'backwards',
          }),
        );
      }
    } catch {
      Promise.allSettled(animations.map((animation) => animation.finished));
      cancel();
      return;
    }

    if (!animations.length) return;
    root.dataset.motionState = 'playing';
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (disposed || currentRun !== runId) return;
      animations = [];
      root.dataset.motionState = 'ready';
    });
  }

  function handlePreferenceChange() {
    if (preference.matches) cancel();
  }

  preference?.addEventListener?.('change', handlePreferenceChange);

  return {
    play,
    cancel,
    dispose() {
      disposed = true;
      cancel();
      preference?.removeEventListener?.('change', handlePreferenceChange);
    },
  };
}

/** Play once when the target enters view; no CSS hides content before enhancement. */
export function onceInView(target, play, threshold = 0.2) {
  const window = target.ownerDocument.defaultView;
  if (typeof window?.IntersectionObserver !== 'function') return () => {};

  let stopped = false;
  const observer = new window.IntersectionObserver(
    (entries) => {
      if (
        !stopped &&
        entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= threshold)
      ) {
        stop();
        play();
      }
    },
    { threshold },
  );

  function stop() {
    stopped = true;
    observer.disconnect();
  }

  observer.observe(target);
  return stop;
}
