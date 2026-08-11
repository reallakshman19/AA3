import '../workspace/linear-piping-results-workbench.css';
import './standalone.css';
import './native-results.css';
import './native-history.css';
import { bootstrapLfeaStandalone } from './bootstrap.js';

const applicationRoot = document.getElementById('root');
const application = bootstrapLfeaStandalone(applicationRoot);

globalThis.LfeaApplication = application;

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.destroy());
}
