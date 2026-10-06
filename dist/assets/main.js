import { initInstallDemo } from './install-demo.js?v=2751385120d5';
import { initNativeOutputs } from './native-outputs.js?v=7f4b82ba129b';
import { initCommandCopy } from './command-copy.js?v=baf029d4751f';

initInstallDemo(document.querySelector('[data-install-demo]'));
initNativeOutputs(document.querySelector('[data-native-demo]'));
initCommandCopy(document.querySelector('[data-command-copy]'));
