import { createMotionController, onceInView } from './motion.js?v=619bc6750a4a';

/** Reveal steps independently so a long mobile section never waits off-screen. */
export function initWorkflowMotion(root) {
  if (!root) return () => {};
  const steps = [...root.querySelectorAll('.workflow-steps > article')];
  const controllers = steps.map((step) => createMotionController(step));
  const stopObservers = steps.map((step, index) =>
    onceInView(step, () => {
      const wide = root.ownerDocument.defaultView.matchMedia?.('(min-width: 601px)').matches;
      controllers[index].play([
        {
          element: step,
          frames: [
            { transform: 'translateY(16px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          delay: wide ? index * 180 : 0,
          duration: 650,
        },
      ]);
    }),
  );

  return () => {
    stopObservers.forEach((stop) => stop());
    controllers.forEach((motion) => motion.dispose());
  };
}
