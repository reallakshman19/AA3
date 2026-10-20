// Source-shape checks follow the cohesive owner split; behavioral assertions stay unchanged.
import { readFileSync } from 'node:fs';
export function readAccdbOwnerSource() {
  return ['lfea-pipeline-accdb-input-panel', 'lfea-accdb-panel-source',
    'lfea-accdb-panel-preparation', 'lfea-accdb-panel-properties',
    'lfea-accdb-panel-coordinates', 'lfea-accdb-panel-lifecycle',
    'lfea-accdb-workbench-batch'].map(name => readFileSync(
    new URL(`../src/workspace/${name}.js`, import.meta.url), 'utf8')).join('\n');
}
