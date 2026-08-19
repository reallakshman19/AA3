// Diagnostic carrier only. Intentionally unimported by production code.
// Its presence triggers existing LAFEA pull-request qualification against an
// otherwise exact-main application graph. Never merge this file.
console.log(JSON.stringify({
  schema: 'lafea-meshing-main-bundle-baseline-trigger/v1',
  status: 'DIAGNOSTIC_ONLY',
  productionGraphMutation: false,
}));
