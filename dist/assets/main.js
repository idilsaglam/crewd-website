import { initInstallDemo } from './install-demo.js?v=2751385120d5';
import { initNativeOutputs } from './native-outputs.js?v=7f4b82ba129b';
import { initCommandCopy } from './command-copy.js?v=baf029d4751f';
import { initCrewPackage } from './crew-package.js?v=cf467bca9dd9';
import { initWaitlistPreview } from './waitlist-preview.js?v=3c946a518b4f';

initInstallDemo(document.querySelector('[data-install-demo]'));
initNativeOutputs(document.querySelector('[data-native-demo]'));
initCommandCopy(document.querySelector('[data-command-copy]'));
initCrewPackage(document.querySelector('[data-crew-package]'));
initWaitlistPreview(document.querySelector('[data-waitlist-form]'));
