# PR1244 Work Report — SJSON Import Front-End Observability

## Identity

- PR: #1244
- Branch: `agent/sjson-import-observability-main69921`
- Exact base SHA: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Criticality: `ENGINEERING_CRITICAL`
- Scope: measurement-only
- Merge authority: OWNER ONLY
- PR state: DRAFT

## Mission

Measure the real normal SJSON file-import front end before selecting another optimization. The new instrumentation must distinguish file read, text decode, JSON parse and SHA-256 time without altering authoritative bytes, parsed content, hash values, event payloads, engineering results or governed browser evidence.

## Implemented

Existing opt-in authority remains:

`?nonFeaP0Evidence=1`

Measured production seams:

```text
SJSON_FILE_READ   -> awaited File.arrayBuffer()
SJSON_DECODE      -> existing TextDecoder path
SJSON_PARSE       -> existing JSON.parse(text)
SJSON_SHA256      -> awaited existing crypto.subtle.digest('SHA-256', sourceBytes)
```

A new `measureNonFeaP0AsyncStage()` spans actual asynchronous completion/failure. Sync and async measurement wrappers record one attempted operation while enabled.

Normal file-import operation contract:

```text
SJSON_FILE_READ = 1
SJSON_DECODE    = 1
SJSON_PARSE     = 1
SJSON_SHA256    = 1
```

Every corresponding duration must be finite and non-negative.

## Disabled-path compatibility

This was treated as a correctness invariant, not a micro-optimization.

When `nonFeaP0Evidence=1` is absent:

- sync wrapper immediately calls the original callback;
- async wrapper immediately returns the original callback/promise;
- no stage validation occurs;
- no operation counter changes;
- no User Timing work occurs.

This preserves the previous production-disabled semantics.

## Governed evidence compatibility

`non-fea-browser-baseline/v1` is an exact-key/exact-stage contract. This PR deliberately does not migrate it.

The existing P0 browser spec reads the new four durations and operation counts in-memory and asserts them, but continues to persist only the governed six stages:

- THREE_MATERIALIZATION
- GPU_SCENE_INSTALL
- FIT
- FIRST_MEANINGFUL_FRAME
- SELECTION
- ORBIT_PAN

Therefore this PR adds observability without changing historical evidence schema identity.

## Qualification

### Executed

`tests/non-fea-p0-observability.test.mjs` was reconstructed from the exact branch module/test and executed with Node:

```text
4 tests
4 pass
0 fail
```

It proves:

1. disabled sync/async direct-callback compatibility;
2. enabled aggregate duration/count behavior;
3. async duration spans resolved work and failed attempts count once;
4. malformed stage/duration input fails only on enabled evidence paths.

### Authored / NOT_RUN in complete checkout

`tests/tree-panel-sjson-import-observability.test.mjs` exercises the real `handleTreeChange()` path and requires exact-one read/decode/parse/hash plus unchanged dataset-load publication. It also verifies disabled import remains uninstrumented.

`scripts/sjson-import-observability-check.mjs` guards the four production seams, exact-one browser assertions, disabled pass-through, and unchanged P0 evidence stage set.

These are **AUTHORED / NOT_RUN** in a complete repository checkout because direct GitHub checkout remains DNS-blocked in this environment.

### Source/diff inspection

GitHub compare against exact base reports:

- two production instrumentation files;
- two existing qualification files modified;
- two new qualification files;
- WIP/PR reports;
- no workflow changes;
- no calculation/model/hash/evidence-contract production changes.

The full-file connector update of `tree-panel-events.js` was re-read after mutation; the changed code is confined to the observability import and the four intended ingest seams.

## P0/P1 authority blocker

This PR does not pretend a browser benchmark can run with substitute data.

Current repository P0 custody still says the accepted 4,884 fixture is:

```text
sourceKind    EXTERNAL_CONTENT_ADDRESSED_FILE
path          null
bindingSource UNBOUND
status        UNBOUND
expected SHA  88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
expected identity: 4884 entities / 3277 pipes / 1331 supports
```

P0 owner acceptance is false and the P1 seed remains BLOCKED. The repository fixture `public/Sjson.json` or any other SJSON is not substituted.

## P1 scope clarification

This PR does not fully satisfy `P1_REQUIRED_STAGE_OBSERVABILITY_REQUIRED`.

The governed P1 observer separately requires:

- SUPPORT_SITE_CONSTRUCTION
- ROUTE_CONSTRUCTION
- MODEL_ZONE_PROJECTION
- RESOLVED_GEOMETRY_CONSTRUCTION
- RENDER_MODEL_CONSTRUCTION
- THREE_MATERIALIZATION
- SCENE_INSTALLATION
- FIT

The next production slice should instrument the currently missing ownership boundaries only, as another measurement-only PR.

## Changed-file ledger

Production:
- `src/workspace/non-fea-p0-observability.js`
- `src/workspace/tree-panel-events.js`

Qualification:
- `tests/non-fea-p0-observability.test.mjs`
- `tests/tree-panel-sjson-import-observability.test.mjs`
- `e2e/non-fea-p0-current-main-baseline.spec.js`
- `scripts/sjson-import-observability-check.mjs`
- `agents/WIP-sjson-import-observability_workreport.md`
- `agents/PR1244_workreport.md`

No `.github/workflows/*` path changed.

## Validation ledger

| Gate | Status |
|---|---|
| Exact-base grounding | PASS |
| `behind_by=0` before PR creation | PASS |
| Bounded production diff | PASS |
| Governed P0 schema unchanged | PASS by source/diff inspection |
| Observability helper Node suite | PASS 4/4 |
| Real `handleTreeChange()` regression | AUTHORED / NOT_RUN |
| Structural anti-drift guard | AUTHORED / NOT_RUN |
| P0 4,884 browser assertion | NOT_RUN / fixture authority unbound |
| P1 4,884 browser run | NOT_RUN / P0 + fixture authority blocked |
| Full build/import/repository gate | NOT_RUN |

No NOT_RUN is represented as PASS.

## Falsifier

Reject/quarantine this PR if observability disabled changes any normal import behavior, or if enabled instrumentation changes:

- source bytes;
- text decode semantics;
- parsed JSON value/error translation;
- SHA-256;
- dataset-load event payload;
- engineering model/result/evidence;
- governed P0 browser evidence schema.

## Highest current risk

The direct real-ingest test has not run from a complete exact checkout. Because instrumentation touches the authoritative source-intake path, this remains the primary merge blocker even though helper-level tests pass.

## EXACT_NEXT_ACTION

Run the direct ingest regression and structural guard on an execution-capable exact PR head. Keep #1244 draft. Independently instrument the remaining P1 ownership-boundary stages; do not choose another performance optimization until a governed 4,884 fixture is bound and current-head browser evidence identifies the dominant stage.