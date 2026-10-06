import { initInstallDemo } from './install-demo.js?v=f28760b32552';
import { initNativeOutputs } from './native-outputs.js?v=0968e41a63c4';
import { initCommandCopy } from './command-copy.js';
import { initCrewPackage } from './crew-package.js?v=cf467bca9dd9';
import { initWaitlistPreview } from './waitlist-preview.js?v=3c946a518b4f';
import { initWorkflowMotion } from './workflow-motion.js?v=2c2ea2eb5506';

initInstallDemo(document.querySelector('[data-install-demo]'));
initNativeOutputs(document.querySelector('[data-native-demo]'));
initCommandCopy(document.querySelector('[data-command-copy]'));
initCrewPackage(document.querySelector('[data-crew-package]'));
initWaitlistPreview(document.querySelector('[data-waitlist-form]'));
initWorkflowMotion(document.querySelector('.workflow-section'));
