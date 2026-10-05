import { initInstallDemo } from './install-demo.js';
import { initNativeOutputs } from './native-outputs.js';
import { initCommandCopy } from './command-copy.js';

initInstallDemo(document.querySelector('[data-install-demo]'));
initNativeOutputs(document.querySelector('[data-native-demo]'));
initCommandCopy(document.querySelector('[data-command-copy]'));
