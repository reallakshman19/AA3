/** Standalone LAFEA product entry. No combined, LFEA, demo, or generic benchmark runtime is composed here. */
import './app.css';
import { LafeaWorkbenchController } from '../workspace/lafea-workbench-controller.js';

const root = document.getElementById('lafea-app-root');
if (!root) throw new TypeError('LAFEA standalone root is required.');

const controller = new LafeaWorkbenchController(root).init();

if (import.meta.hot) {
  import.meta.hot.dispose(() => controller.destroy());
}
