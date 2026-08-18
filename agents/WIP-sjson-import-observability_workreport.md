# WIP — SJSON Import Front-End Observability

## Identity

- Branch: `agent/sjson-import-observability-main69921` (historic name; fast-forwarded to current base before mutation)
- Exact creation/mutation base: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Criticality: `ENGINEERING_CRITICAL` because the measured path carries authoritative source bytes/hash into the engineering dataset
- Scope: measurement-only
- Merge authority: OWNER ONLY

## Mission

Add exact gated observability for the real normal SJSON file-import front end:

```text
File.arrayBuffer -> text decode -> JSON.parse -> SHA-256
```

The purpose is to distinguish import-front latency from downstream normalization/model/render work before choosing another optimization.

## Authority boundary

Instrumentation is enabled only by the existing query authority:

`?nonFeaP0Evidence=1`

When disabled, synchronous and asynchronous timing helpers retain the previous direct-callback behavior. They do not validate stage IDs, increment counters or call User Timing.

No parsed value, source byte, SHA-256 value, dataset event payload, semantic hash, engineering formula, blocker/readiness state, viewport result or governed P0 evidence schema is changed.

## Implemented stages

Normal file input now measures exactly these real seams:

- `SJSON_FILE_READ` — awaited `File.arrayBuffer()`;
- `SJSON_DECODE` — `TextDecoder(...).decode(...)` through the existing BOM/encoding path;
- `SJSON_PARSE` — the existing `JSON.parse(text)`;
- `SJSON_SHA256` — awaited existing `crypto.subtle.digest('SHA-256', sourceBytes)`.

`measureNonFeaP0AsyncStage()` spans promise resolution/rejection instead of measuring only promise creation.

Each sync/async measurement records one attempted operation while evidence mode is enabled. Failed attempts remain observable as attempts.

## Normal-import quantitative contract

For one ordinary file-picker SJSON import:

```text
SJSON_FILE_READ   count = 1
SJSON_DECODE      count = 1
SJSON_PARSE       count = 1
SJSON_SHA256      count = 1
```

The four durations must each be finite and non-negative.

This is an observability contract, not a performance result.

## Governed P0 evidence compatibility

`scripts/non-fea-baseline/browser-baseline.mjs` defines an exact persisted `non-fea-browser-baseline/v1` stage set:

- THREE_MATERIALIZATION
- GPU_SCENE_INSTALL
- FIT
- FIRST_MEANINGFUL_FRAME
- SELECTION
- ORBIT_PAN

This PR deliberately does **not** add the four SJSON stages to that persisted schema. The existing P0 Playwright run reads the new durations/counts in-memory and asserts them, then writes the same governed six-stage evidence payload.

## P1 scope clarification

This PR improves import-front attribution but does **not** by itself clear `P1_REQUIRED_STAGE_OBSERVABILITY_REQUIRED`.

The current P1 observer separately requires:

- SUPPORT_SITE_CONSTRUCTION
- ROUTE_CONSTRUCTION
- MODEL_ZONE_PROJECTION
- RESOLVED_GEOMETRY_CONSTRUCTION
- RENDER_MODEL_CONSTRUCTION
- THREE_MATERIALIZATION
- SCENE_INSTALLATION
- FIT

Those ownership-boundary measurements should be a second, separate measurement-only slice.

## Qualification assets

### `tests/non-fea-p0-observability.test.mjs`

Covers:

- disabled direct-callback behavior;
- deterministic aggregate durations/counts;
- async resolved work timing;
- failed-attempt counting;
- malformed evidence rejection only when enabled.

Connector-reconstructed exact branch execution: **PASS 4/4**.

### `tests/tree-panel-sjson-import-observability.test.mjs`

Exercises the real `handleTreeChange()` seam with a normal SJSON file and requires one read/decode/parse/hash operation plus the existing dataset-load publication. Also checks disabled mode remains uninstrumented.

Status: **AUTHORED / NOT_RUN** in a complete repository checkout.

### `scripts/sjson-import-observability-check.mjs`

Anti-drift source guard for the four real seams, exact-one browser assertions, disabled pass-through, and unchanged governed P0 stage schema.

Status: **AUTHORED / NOT_RUN** in a complete repository checkout.

## Validation ledger

| Gate | Status |
|---|---|
| Exact base/current-main grounding | PASS at mutation start |
| Production diff review | PASS: instrumentation only |
| Existing P0 evidence schema unchanged | PASS by source/diff inspection |
| Observability helper reconstructed test | PASS 4/4 |
| Direct real-ingest Node regression | AUTHORED / NOT_RUN |
| Anti-drift source guard | AUTHORED / NOT_RUN |
| P0 4,884 browser assertion | NOT_RUN — fixture authority/path remains unbound |
| P1 4,884 browser measurement | NOT_RUN / BLOCKED by P0 authority and fixture binding |
| Full build/import/repository gate | NOT_RUN |

No NOT_RUN result is represented as PASS.

## P0/P1 external blocker retained

Current repository evidence explicitly records the 4,884 fixture as:

```text
sourceKind   EXTERNAL_CONTENT_ADDRESSED_FILE
path         null
bindingSource UNBOUND
status       UNBOUND
expected SHA 88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
entityCount  4884
pipeCount    3277
supportCount 1331
```

This PR does not infer or substitute fixture bytes/path and does not grant owner acceptance.

## Changed-file ledger

Production:
- `src/workspace/non-fea-p0-observability.js`
- `src/workspace/tree-panel-events.js`

Qualification only:
- `tests/non-fea-p0-observability.test.mjs`
- `tests/tree-panel-sjson-import-observability.test.mjs`
- `e2e/non-fea-p0-current-main-baseline.spec.js`
- `scripts/sjson-import-observability-check.mjs`
- `agents/WIP-sjson-import-observability_workreport.md`

No workflow file is changed.

## Falsifier

Reject this slice if evidence mode off changes any import behavior, or if evidence mode on changes:

- source bytes;
- decoded/parsed package;
- SHA-256;
- dataset-load event payload;
- error translation;
- governed P0 evidence schema;
- engineering output or authorization state.

## Highest current risk

The full real-ingest regression and browser path have not executed in a complete checkout. The file-import instrumentation itself is small, but it sits before authoritative dataset creation and therefore must remain semantics-neutral.

## EXACT_NEXT_ACTION

Run the direct ingest regression and structural guard on an execution-capable exact-head checkout. If clean, open/freeze the draft PR and proceed separately to the remaining P1 ownership-boundary observability stages; do not optimize another production path until measured evidence identifies the dominant stage.