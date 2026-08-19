# EMP.1 Core Module Scaffold — Issue #1261

Status: **DORMANT ARCHITECTURE SCAFFOLD / NOT PRODUCT-WIRED / NO WRC NUMERICAL AUTHORITY**

Base: `main@b841975b20e547c721447e95527a995805d9761a`

This scaffold gives the next implementation agent reviewable module boundaries for the unified EMP.1 product without renaming current production stages or activating WRC. It intentionally contains no WRC coefficient, equation, sign convention, interpolation rule, benchmark value, code-compliance logic, or release authority.

## Module map

| Module | Responsibility | Must not own |
|---|---|---|
| `emp1-identity.js` | Product/component/schema identities and authority boundary | mechanics, source values |
| `emp1-source-contract.js` | One authoritative EMP.1 source envelope; structural custody only | WRC geometry semantics not yet source-qualified |
| `emp1-dependency-graph.js` | Exact downstream invalidation classes | numerical calculation |
| `emp1-local-correlation-gate.js` | Fail-closed WRC/local-method execution gate | WRC evaluator |
| `emp1-assessment.js` | Combine A/B/C states into PASS/ESCALATE/BLOCKED | code compliance |
| `emp1-orchestrator.js` | Dependency-aware A → B → C execution through injected adapters | legacy mechanics reimplementation |
| `index.js` | Bounded export surface | product registration |

## Required production mapping

The scaffold must ultimately adapt existing retained mechanics rather than copy them:

```text
EMP.1 source
   │
   ├─ EMP.1.A adapter → existing load-transfer / pressure-baseline authority
   │                      result hash retained independently
   │
   ├─ EMP.1.B adapter → existing nominal section-screening authority
   │                      consumes retained A evidence
   │
   └─ EMP.1.C adapter → source-qualified local correlation only
                          BLOCKED until method + benchmark authority exists
```

LAFEA.3+ FEA routes remain outside this graph.

## Code snippets

### 1. Public identity without collapsing evidence

```js
export const EMP1_COMPONENTS = Object.freeze({
  LOAD_TRANSFER: 'EMP.1.A',
  SECTION_SCREENING: 'EMP.1.B',
  LOCAL_CORRELATION: 'EMP.1.C',
  ASSESSMENT: 'EMP.1',
});
```

The user sees one EMP.1 product. Auditors still receive separate A/B/C evidence identities.

### 2. Dependency invalidation

```js
const INVALIDATION = {
  GEOMETRY: ['EMP.1.A', 'EMP.1.B', 'EMP.1.C', 'EMP.1', 'EMP.1.BENCHMARK'],
  SECTION: ['EMP.1.B', 'EMP.1.C', 'EMP.1', 'EMP.1.BENCHMARK'],
  LOCAL_METHOD: ['EMP.1.C', 'EMP.1', 'EMP.1.BENCHMARK'],
};
```

A section-only edit must not rerun an unchanged load transfer. A local-method/source change must not silently invalidate unrelated nominal mechanics.

### 3. Fail-closed WRC gate

```js
const gate = evaluateEmp1LocalCorrelationGate({
  methodQualification,
  benchmarkQualification,
});

if (gate.state !== 'METHOD_QUALIFIED') {
  // EMP.1.C stays BLOCKED; no WRC evaluator is called.
}
```

The gate demands explicit engineering-use authority, source SHA-256, dataset hash, qualification-record hash, and benchmark PASS/hash. The scaffold itself sets no method as authorized.

### 4. One Run, injected mechanics

```js
const result = await runEmp1({
  source,
  changeClasses: ['SECTION'],
  previous,
  adapters: {
    runLoadTransfer,      // existing authority adapter
    runSectionScreening,  // existing authority adapter
    runLocalCorrelation,  // future qualified method adapter
  },
});
```

`runEmp1()` is deliberately adapter-based: it must not become a duplicate implementation of the existing LAFEA.1/LAFEA.2 numerical kernels.

## Next-agent implementation sequence

1. Pass Issue #1261 Appendix A and re-ground live main/open PR overlap.
2. Extract and freeze CAUx 2017 pp. 24–31 plus exact raw PDF SHA-256 before WRC production observation.
3. Map current LAFEA.1/LAFEA.2 contracts/functions to EMP.1.A/B adapters and prove numerical identity.
4. Add deterministic legacy migration tests; only then remove user-facing LAFEA.1/.2 route identity.
5. Build the unified UI and SVG preview as a pure source projection.
6. Implement EMP.1.C only after WRC source/benchmark qualification is complete.

## Hard stop

Do not register these modules as production authority yet. Do not import them into the current stage registry, workbench route, calculation registry, or release path until exact compatibility and source qualification gates in Issue #1261 are satisfied.
