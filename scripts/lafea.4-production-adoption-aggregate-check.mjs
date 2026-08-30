const gates = [
  './lafea.4-mitc-adoption-element-check.mjs',
  './lafea.4-mitc-adoption-pressure-check.mjs',
  './lafea.4-mitc-adoption-solve-check.mjs',
  './lafea.4-mitc-adoption-recovery-check.mjs',
  './lafea.4-mitc-adoption-shared-qualification-check.mjs',
  './lafea.4-production-route-benchmarks-check.mjs',
  './lafea.4-mitc-production-route-check.mjs',
];

for (const gate of gates) await import(gate);

console.log('\n✅ LAFEA.4 production-adoption aggregate completed.');
