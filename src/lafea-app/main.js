/** Standalone LAFEA product entry. No combined or LFEA runtime is composed here. */
import './app.css';
import { mountLafeaWorkbench } from '../workspace/lafea-workbench.js';

const root = document.getElementById('lafea-app-root');
if (!root) throw new TypeError('LAFEA standalone root is required.');

const controller = mountLafeaWorkbench(root);

if (import.meta.hot) {
  import.meta.hot.dispose(() => controller.destroy());
}
