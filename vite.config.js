import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const buildTime = new Date().toISOString();

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
 * Keep manual chunking limited to dependency-oriented or calculation-core
 * domains. Workspace modules remain graph-owned because they contain stores,
 * controllers, views, and top-level singleton instances with cross-feature
 * imports. The narrow workspace exceptions below contain only stateless pure
 * contract/projection helpers and own no runtime singleton.
 */
export function manualChunk(id) {
  const source = id.replaceAll('\\', '/');
  if (source.includes('vite/preload-helper')) return 'runtime';
  if (source.includes('/node_modules/three/examples/')) return 'vendor-three-examples';
  if (source.includes('/node_modules/three/')) return 'vendor-three-core';
  // Keep xlsx on Rollup's existing dynamic-import boundary; it is already a
  // large isolated chunk and must not be folded into the generic leaf vendor.
  if (source.includes('/node_modules/xlsx/')) return undefined;
  // Dependency-only partition. Workspace modules remain graph-owned below so
  // this cannot create controller/store evaluation-order cycles.
  if (source.includes('/node_modules/')) return 'vendor';
  if (source.includes('/src/core/element-fea/')) return 'core-element-fea';
  if (source.includes('/src/core/local-continuum/')) return 'core-local-continuum';
  if (source.includes('/src/core/local-shell/')) return 'core-local-shell';
  if (source.includes('/src/core/local-stress/')) return 'core-local-stress';
  if (source.includes('/src/core/local-attachment-screening/')) return 'core-attachment-screening';
  if (source.includes('/src/core/local-trunnion-footprint/')) return 'core-local-trunnion-footprint';
  if (source.includes('/src/core/linear-fea-')) return 'core-linear-fea';
  if (source.includes('/src/core/linear-piping-')) return 'core-linear-piping';
  if (source.includes('/src/core/support-')) return 'core-support-engineering';
  if (source.includes('/src/core/vertical-beam-solver/')
    || source.includes('/src/core/centerline-beam-fea/')) return 'core-beam-analysis';
  if (source.includes('/src/core/first-cut-load-estimation/')) return 'core-load-estimation';
  if (source.includes('/src/core/model-calculation-package/')) return 'core-model-calculation';
  if (source.includes('/src/core/piping-topology/')
    || source.includes('/src/core/shared-piping-model/')) return 'core-piping-model';
  if (source.includes('/src/core/fea-benchmarks/')) return 'core-fea-benchmarks';
  if (source.includes('/src/core/')) return 'core-application';
  if (source.includes('/src/calc-workspace/cii-standalone-port/ui-adapted/')) {
    return 'cii-standalone-ui';
  }
  if (source.includes('/src/calc-workspace/cii-standalone-port/')) {
    return 'cii-standalone-core';
  }
  if (source.includes('/src/calc-workspace/')) return 'calculation-workspaces';
  if (source.includes('/src/vendors/')) return 'vendor-integrations';
  if (source.includes('/src/utils/') || source.includes('/src/mocks/')) return 'application-support';
  // These exact paths are stateless LAFEA meshing contracts/producers. Keeping
  // the exception explicit avoids pulling controllers, stores, views, or other
  // singleton-bearing workspace modules into a forced chunk.
  if ([...PURE_LAFEA_MESHING_WORKSPACE_MODULES]
    .some((modulePath) => source.endsWith(modulePath))) {
    return 'lafea-meshing-contracts';
  }
  // This helper owns no controller/store/singleton state. Splitting its I/O and
  // style dependencies gives the graph a safe leaf boundary without forcing
  // the LAFEA workbench controller itself into a manual chunk.
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
  // Fidelity evidence publication is a stateless projection to host datasets.
  // Keep it out of the large stateful SJSON controller chunk while leaving the
  // controller/backend lifecycle under Rollup graph-aware ownership.
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
  // These modules are pure event validation and presentation projection. They
  // own no controller, store, mutable singleton, or runtime resource, so they
  // form a safe leaf boundary for the LFEA-to-3D-Edit integration.
  if (source.endsWith('/src/workspace/event-topics.js')
    || source.endsWith('/src/workspace/lfea-support-actions-panel.js')) {
    return 'workspace-event-presentation-contracts';
  }
  // PR #1016 adds a bounded set of read-only views, immutable qualification
  // custody, and derived readiness/release projections. These modules export
  // functions/contracts only; they own no workbench controller, store, mounted
  // viewport, or top-level mutable singleton. Keeping them in a dedicated leaf
  // chunk reduces the entry chunk without manually partitioning the stateful
  // workbench composition graph.
  if ([...PURE_LAFEA_WORKBENCH_GOVERNANCE_MODULES]
    .some((modulePath) => source.endsWith(modulePath))) {
    return 'lafea-workbench-governance';
  }

  // The Phase-1 pre-flight core is an indexed, DOM-free, clock-free leaf stack.
  // scripts/lafea-preflight-phase1-indexed-model-check.mjs asserts both halves of
  // what makes this split safe: these modules create no DOM and read no ambient
  // clock, and none of them imports the live UI, the review surface or the
  // application entry point. The dependency therefore runs one way, so giving
  // them their own chunk cannot reorder evaluation of a stateful workspace
  // controller. Splitting them keeps the main chunk under the production
  // ceiling asserted by scripts/bundle-chunk-check.mjs.
  if (source.includes('/src/workspace/lafea-preflight-phase1-')) {
    return 'lafea-preflight-phase1';
  }

  // Rollup must own the complete stateful workspace graph so evaluation order
  // follows static dependency analysis rather than filename-based partitions.
  if (source.includes('/src/workspace/')) return undefined;
  return undefined;
}

export default defineConfig({
  base: './',
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
        // Allow dependencies of a selected manual chunk to move with that
        // chunk. Explicit-only ownership created circular chunks and TDZ
        // failures in the generated ESM graph.
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
