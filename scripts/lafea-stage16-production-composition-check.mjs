import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const entry = read('src/lafea-app/main.js');
const standaloneController = read('src/lafea-app/standalone-controller.js');
const controller = read('src/workspace/lafea-workbench-controller.js');
const facade = read('src/workspace/lafea-workbench.js');
const simulatedProvider = read('src/workspace/lafea-simulated-source-provider.js');
const css = read('src/lafea-app/app.css');
const e2e = read('e2e/lafea-standalone.spec.js');

assert(entry.includes("from './standalone-controller.js'"),
  'Production entry must import the standalone LAFEA controller.');
assert(entry.includes('new LafeaStandaloneController(root).init()'),
  'Production entry must initialize the standalone controller without compatibility providers.');
assert(!entry.includes('../workspace/lafea-workbench.js'),
  'Production entry must not import the compatibility facade.');
assert(standaloneController.includes("from '../workspace/lafea-workbench-controller.js'"),
  'Standalone controller must extend the canonical LAFEA controller.');
assert(standaloneController.includes("from '../workspace/lafea-controller-run-evidence.js'"),
  'Standalone controller may add only LAFEA-owned historic run evidence at this composition seam.');

for (const forbidden of [
  './fea-benchmark-panel.js',
  './advanced-mock-data.js',
  './lafea-simulated-source-provider.js',
  'FeaBenchmarkPanel',
  'createLafeaMockDocument',
]) {
  assert(!controller.includes(forbidden),
    `LAFEA controller must not own compatibility dependency ${forbidden}.`);
  assert(!standaloneController.includes(forbidden),
    `Standalone controller must not own compatibility dependency ${forbidden}.`);
}
assert(controller.includes('benchmarkPanelFactory'),
  'LAFEA controller must accept an injected benchmark panel factory.');
assert(controller.includes('mockDocumentFactory'),
  'LAFEA controller must accept an injected simulated-source factory.');
assert(controller.includes('this.benchmarkPanel?.render()'),
  'Benchmark rendering must remain optional.');
assert(controller.includes('LAFEA_SIMULATED_SOURCE_NOT_CONFIGURED'),
  'Missing simulated-source provider must fail closed.');

assert(facade.includes("from './fea-benchmark-panel.js'"),
  'Compatibility facade must retain the existing generic benchmark provider.');
assert(facade.includes("from './lafea-simulated-source-provider.js'"),
  'Compatibility facade must retain the lazy simulated-source provider.');
assert(facade.includes('benchmarkPanelFactory,'),
  'Compatibility facade must inject the benchmark provider into the controller.');
assert(facade.includes('mockDocumentFactory,'),
  'Compatibility facade must inject the simulated-source provider into the controller.');
assert(simulatedProvider.includes("await import('./advanced-mock-data.js')"),
  'Compatibility simulated-source provider must retain lazy loading.');

assert(css.includes('[data-role="lafea-mock"]') && css.includes('[data-role="lafea-benchmark"]'),
  'Production CSS must suppress compatibility-only toolbar controls.');
assert(e2e.includes("[data-role=\"lafea-mock\"]") && e2e.includes('toBeHidden()'),
  'Standalone E2E must assert the simulated-source control is not exposed.');
assert(e2e.includes("[data-role=\"lafea-benchmark-host\"]") && e2e.includes('toHaveCount(0)'),
  'Standalone E2E must assert the generic benchmark host is absent.');

console.log(JSON.stringify({
  schema: 'lafea-stage16-production-composition-check/v1',
  status: 'PASS',
  roadmap: 'A16',
  productionImportsStandaloneController: true,
  canonicalControllerRemainsCompositionRoot: true,
  compatibilityFacadeExcluded: true,
  genericBenchmarkProviderExcluded: true,
  simulatedSourceProviderExcluded: true,
  compatibilityFacadeBehaviorRetained: true,
  simulatedSourceCompatibilityRemainsLazy: true,
  productionCompatibilityControlsExposed: false,
}));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
