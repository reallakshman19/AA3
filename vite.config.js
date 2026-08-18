import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

import {
  computeLafea4Tech13ImplementationFingerprint,
} from './scripts/lib/lafea4-tech13-implementation-fingerprint.mjs';

const buildTime = new Date().toISOString();
const tech13Implementation = computeLafea4Tech13ImplementationFingerprint({
  rootDir: fileURLToPath(new URL('.', import.meta.url)),
});
process.env.VITE_LAFEA4_TECH13_IMPLEMENTATION_FINGERPRINT = tech13Implementation.fingerprint;

const PURE_LAFEA_MESHING_WORKSPACE_MODULES = new Set([
  '/src/workspace/lafea-analysis-mesh-evidence-v2.js',
  '/src/workspace/lafea-domain-first-mesh-custody.js',
  '/src/workspace/lafea-mesh-capabilities.js',
  '/src/workspace/lafea-mesh-dof-policy.js',
  '/src/workspace/lafea-mesh-geometry-topology-adapter.js',
  '/src/workspace/lafea-mesh-producer-binding.js',
  '/src/workspace/lafea-mesh-producer-engine.js',
  '/src/workspace/lafea-mesh-producer-registry.js',
  '/src/workspace/lafea-mesh-producer-v2-contracts.js',
  '/src/workspace/lafea-mesh-refinement-command.js',
  '/src/workspace/lafea-retained-mesh-refinement.js',
  '/src/workspace/lafea-shell-curved-hole-midsurface-contract.js',
  '/src/workspace/lafea-shell-curved-midsurface-contract.js',
  '/src/workspace/lafea-shell-mesh-producer.js',
  '/src/workspace/lafea-shell-midsurface-contract.js',
  '/src/workspace/lafea-shell-midsurface-dispatch.js',
  '/src/workspace/lafea-shell-periodic-midsurface-contract.js',
]);

const PURE_LAFEA_WORKBENCH_GOVERNANCE_MODULES = new Set([
  '/src/workspace/lafea-analysis-settings-view.js',
  '/src/workspace/lafea-guided-workflow.js',
  '/src/workspace/lafea-guided-workflow-view.js',
  '/src/workspace/lafea-numerical-verification-view.js',
  '/src/workspace/lafea-t6-geometry-qualification-custody.js',
  '/src/workspace/lafea-t6-geometry-qualification-state.js',
  '/src/workspace/lafea-t6-geometry-qualification-view.js',
  '/src/workspace/lafea-workbench-orchestration-projection.js',
  '/src/workspace/lafea-workbench-readiness.js',
  '/src/workspace/lafea-workbench-reason-labels.js',
  '/src/workspace/lafea-workbench-release-binding.js',
  '/src/workspace/lafea-workbench-verification-state.js',
]);

/**
 * Stateless empirical authority calculators and validators. Each module takes
 * complete inputs, returns immutable evidence, and owns no controller, store,
 * DOM resource, ambient fallback, or module-level mutable engineering state.
 */
const PURE_EMPIRICAL_AUTHORITY_WORKSPACE_MODULES = new Set([
  '/src/workspace/engineering-loads/adapters/canonical-thermal-rom-authority-adapter.js',
  '/src/workspace/engineering-loads/adapters/empirical-v3-authorized-source-bound-execution.js',
  '/src/workspace/engineering-loads/adapters/empirical-v3-live-run-orchestration.js',
  '/src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js',
  '/src/workspace/engineering-loads/authorized-empirical-load-execution.js',
  '/src/workspace/engineering-loads/authorized-empirical-load-input.js',
  '/src/workspace/engineering-loads/authorized-empirical-runtime-package.js',
  '/src/workspace/engineering-loads/empirical-component-load-authority.js',
  '/src/workspace/engineering-loads/empirical-result-overlay.js',
  '/src/workspace/engineering-loads/preproduction-thermal-liftoff-displacement-authority.js',
  '/src/workspace/engineering-loads/support-load-distribution-v3.js',
  '/src/workspace/project-data/non-fea-configured-default-provider.js',
]);

/**
 * Stateless linear-piping intake and run-gate contracts. These modules seal or
 * validate complete caller-owned records, import only pure core authority, and
 * own no controller, store, DOM resource, or module-level mutable state.
 */
const PURE_LINEAR_PIPING_AUTHORITY_WORKSPACE_MODULES = new Set([
  '/src/workspace/linear-piping-inputxml-intake.js',
  '/src/workspace/linear-piping-inputxml-prefea.js',
  '/src/workspace/linear-piping-run-gate.js',
  '/src/workspace/linear-piping-run-request.js',
]);

/**
 * Keep manual chunking limited to dependency-oriented or calculation-core
 * domains. Workspace modules remain graph-owned because they contain stores,
 * controllers, views, and top-level singleton instances with cross-feature
 * imports. The narrow workspace exceptions below contain only stateless pure
 * contract/projection helpers and own no runtime singleton.
 */
/**
 * The `mdb-reader` stack, reached only by dynamic import when a user selects
 * an .accdb file. Listed explicitly so it stays out of the eager vendor chunk.
 */
const ACCDB_READER_PACKAGE_PATHS = Object.freeze([
  '/node_modules/mdb-reader/',
  '/node_modules/buffer/',
  '/node_modules/pako/',
  '/node_modules/browserify-aes/',
  '/node_modules/create-hash/',
  '/node_modules/cipher-base/',
  '/node_modules/evp_bytestokey/',
  '/node_modules/md5.js/',
  '/node_modules/ripemd160/',
  '/node_modules/sha.js/',
  '/node_modules/hash-base/',
  '/node_modules/readable-stream/',
  '/node_modules/base64-js/',
  '/node_modules/ieee754/',
  '/node_modules/safe-buffer/',
  '/node_modules/inherits/',
]);

/**
 * Style leaves: each exports only a static CSS string, or a stateless
 * installer that builds one `<style>` element from one. None holds
 * module-level mutable state, none is imported by another of them, and
 * nothing imports a controller, store or view from them.
 */
const STYLE_LEAF_MODULES = Object.freeze([
  '/src/workspace/workspace-shell-styles.js',
  '/src/workspace/lafea-workbench-styles.js',
  '/src/workspace/lfea-workbench-styles.js',
  '/src/workspace/lafea-guided-workbench-styles.js',
  '/src/workspace/viewport-productivity/topology-edit-table-styles.js',
  '/src/workspace/viewport-productivity/topology-edit-object-tree-styles.js',
  '/src/workspace/viewport-productivity/topology-edit-professional-operation-styles.js',
  '/src/workspace/viewport-productivity/topology-edit-authoring-styles.js',
]);

export function manualChunk(id) {
  const source = id.replaceAll('\\', '/');
  if (source.includes('vite/preload-helper')) return 'runtime';
  if (source.includes('/node_modules/three/examples/')) return 'vendor-three-examples';
  if (source.includes('/node_modules/three/')) return 'vendor-three-core';
  if (source.includes('/node_modules/xlsx/')) return undefined;
  if (ACCDB_READER_PACKAGE_PATHS.some((path) => source.includes(path))) return undefined;
  if (source.includes('/node_modules/')) return 'vendor';
  if (source.includes('/src/core/element-fea/')) return 'core-element-fea';
  if (source.includes('/src/core/local-continuum/')) return 'core-local-continuum';
  if (source.includes('/src/core/local-shell/')) return 'core-local-shell';
  if (source.includes('/src/core/local-stress/')) return 'core-local-stress';
  if (source.includes('/src/core/local-attachment-screening/')) return 'core-attachment-screening';
  if (source.includes('/src/core/local-trunnion-footprint/')) return 'core-local-trunnion-footprint';
  if (source.includes('/src/core/linear-fea-')) return 'core-linear-fea';
  if (source.includes('/src/core/linear-piping-')) return 'core-linear-piping';
  if (source.includes('/src/core/support-')) return 'core-application';
  if (source.includes('/src/core/vertical-beam-solver/')
    || source.includes('/src/core/centerline-beam-fea/')) return 'core-application';
  if (source.includes('/src/core/first-cut-load-estimation/')) return 'core-load-estimation';
  if (source.includes('/src/core/model-calculation-package/')) return 'core-application';
  if (source.includes('/src/core/piping-topology/')
    || source.includes('/src/core/shared-piping-model/')) return 'core-application';
  if (source.includes('/src/core/fea-benchmarks/')) return 'core-fea-benchmarks';
  if (source.includes('/src/core/')) return 'core-application';
  if (source.includes('/src/calc-workspace/cii-standalone-port/ui-adapted/')) {
    return 'cii-standalone-ui';
  }
  if (source.includes('/src/calc-workspace/cii-standalone-port/')) {
    return 'cii-standalone-core';
  }
  if (source.includes('/src/calc-workspace/')) return 'cii-standalone-core';
  if (source.includes('/src/vendors/')) return 'vendor-integrations';
  if (source.includes('/src/utils/') || source.includes('/src/mocks/')) return 'application-support';
  if ([...PURE_LAFEA_MESHING_WORKSPACE_MODULES]
    .some((modulePath) => source.endsWith(modulePath))) {
    return 'lafea-workbench-governance';
  }
  if (source.endsWith('/src/workspace/lafea-workbench-controller-io.js')) {
    return 'lafea-workbench-io';
  }
  if (source.endsWith('/src/workspace/topology-edit/topology-edit-inline-component-replacement.js')
    || source.endsWith('/src/workspace/topology-edit/topology-edit-junction-relation-command.js')
    || source.endsWith('/src/workspace/topology-edit/topology-edit-engineering-edit-effect.js')) {
    return 'topology-edit-engineering-commands';
  }
  if (source.endsWith('/src/workspace/topology-edit/topology-edit-stagedjson-engineering-source.js')) {
    return 'topology-edit-stagedjson-source-engineering';
  }
  if (source.endsWith('/src/workspace/topology-edit/editor-state/topology-edit-capability-contract.js')
    || source.endsWith('/src/workspace/topology-edit/table/topology-edit-table-edit-capability.js')
    || source.endsWith('/src/workspace/viewport-interaction/topology-edit-endpoint-affordance-model.js')
    || source.endsWith('/src/workspace/viewport-interaction/topology-edit-endpoint-affordance-runtime.js')) {
    return 'topology-edit-r1-pure-presentation';
  }
  if (source.endsWith('/src/workspace/topology-edit/topology-edit-sjson-fidelity-evidence-v2.js')) {
    return 'topology-edit-sjson-evidence';
  }
  if (source.endsWith('/src/workspace/resolved-engineering-geometry.js')
    || source.endsWith('/src/workspace/model-zone-selector.js')
    || source.endsWith('/src/workspace/model-zone-viewport-projection.js')
    || source.endsWith('/src/workspace/viewport-render-model.js')
    || source.endsWith('/src/workspace/support-load-viewport-callout-projection.js')) {
    return 'workspace-viewport-engineering-projections';
  }
  if (source.endsWith('/src/workspace/event-topics.js')
    || source.endsWith('/src/workspace/lafea-support-actions-panel.js')) {
    return 'workspace-event-presentation-contracts';
  }
  if (source.endsWith('/src/workspace/workspace-shell-styles.js')) {
    return 'application-shell-static-styles';
  }
  if ([...PURE_LAFEA_WORKBENCH_GOVERNANCE_MODULES]
    .some((modulePath) => source.endsWith(modulePath))) {
    return 'lafea-workbench-governance';
  }
  if (source.endsWith('/src/workspace/lafea-canonical-sha256.js')) {
    return 'core-application';
  }
  if ([...PURE_EMPIRICAL_AUTHORITY_WORKSPACE_MODULES]
    .some((modulePath) => source.endsWith(modulePath))) {
    return 'empirical-engineering-authority';
  }
  if ([...PURE_LINEAR_PIPING_AUTHORITY_WORKSPACE_MODULES]
    .some((modulePath) => source.endsWith(modulePath))) {
    return 'linear-piping-authority';
  }
  if (source.includes('/src/workspace/lafea-preflight-phase1-')) {
    return 'lafea-preflight-phase1';
  }
  if (STYLE_LEAF_MODULES.some((modulePath) => source.endsWith(modulePath))) {
    return 'application-shell-css';
  }
  if (source.endsWith('/src/workspace/engineering-loads/empirical-beam-contact-runtime.js')) {
    return 'engineering-loads-beam-contact-runtime';
  }
  if (source.includes('/src/workspace/')) return undefined;
  return undefined;
}

export default defineConfig({
  base: '/Advanced_Analysis/',
  plugins: [],
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        analyze: fileURLToPath(new URL('./analyze.html', import.meta.url)),
      },
      output: {
        manualChunks: manualChunk,
        onlyExplicitManualChunks: false,
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/benchmarks/**', '**/reports/**', '**/playwright-report/**'],
    },
  },
});