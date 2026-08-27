import { renderNonFeaCalculationDefaultsView } from './non-fea-calculation-defaults-view.js';
import {
  renderNonFeaCalculationEffectiveValuesInspector,
} from './non-fea-calculation-effective-values-view.js';
import { renderProjectDataFullView } from './project-data-view-full.js';

/**
 * Routes Project Data to the consumer-appropriate editor.
 *
 * Load Calc receives the normal Calculation Defaults surface, whose Advanced
 * authority drawer still exposes the complete Non-FEA Project Data editor.
 * LFEA and other consumers retain the full Project Data profile directly.
 */
export function renderProjectDataView(container, onChanged) {
  if (!container) throw new TypeError('Project Data view requires a container.');
  const inLoadCalc = Boolean(container.closest?.('[data-role="load-calc-consumer"]'));
  if (!inLoadCalc) return renderProjectDataFullView(container, onChanged);

  const refreshLoadCalc = () => {
    if (typeof onChanged === 'function') onChanged();
    else renderProjectDataView(container, onChanged);
  };
  const result = renderNonFeaCalculationDefaultsView(container, refreshLoadCalc);
  renderNonFeaCalculationEffectiveValuesInspector(container);
  return result;
}
