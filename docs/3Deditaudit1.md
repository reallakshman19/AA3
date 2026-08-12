# 3D Edit Audit 1 — Engineering Authority and Lifecycle

## 1. Purpose

This document audits the 3D Edit application as an engineering editor, not as a screenshot or rendering demo.

The audit method is the complete user-to-authority lifecycle:

> **Observe → identify canonical entity → attempt operation → inspect transient preview → inspect governed command → apply → inspect canonical topology → inspect rendering → Undo → Redo → save/reopen → repeat through another UI surface.**

The required architecture for an engineering edit is:

`User interaction → canonical selection → operation eligibility → transient interaction/HUD draft → snap/constraint → ghost → governed command plan → compatibility/certification → atomic transaction → canonical topology/journal → Three projection`

The audit therefore asks two separate questions:

1. **Architecture conformance:** does production code preserve the engineering authority chain?
2. **Empirical qualification:** has the complete visible user lifecycle been demonstrated on an exact application revision in a real browser?

A mechanism can be architecturally correct and still be **NOT QUALIFIED** until the visible lifecycle is executed and evidenced.

---

## 2. Audit metadata

| Item | Value |
|---|---|
| Repository | `reallaksh19/Advanced_Analysis` |
| 3D Edit snapshot audited | `eea9fbdb837241f47cebdb1e4e7afd8c8b414241` |
| Audit date | `2026-08-12` |
| Current `main` when this document was written | `76b59765772bcdfa7ba8b708560a22015fa4c87e` |
| Current-main drift disposition | Non-invalidating. The delta from the audited snapshot to current main contains LAFEA/common-stage files and no audited `topology-edit` / 3D Edit viewport paths. |
| Audit type | Production-source inspection + test-source inspection + retained exact-head Chromium evidence |
| New browser run executed specifically for this document | **No** |

### Evidence classes used in this audit

- **STATIC-PRODUCTION** — behavior is established from current production code inspection.
- **TEST-SOURCE** — a deterministic test exists and its assertions were inspected; this does **not** mean it was executed during this audit.
- **EMPIRICAL-CHROMIUM** — a real Chromium run on an exact known head was inspected, including test result/evidence identity.
- **NOT-QUALIFIED** — implementation may exist, but the required current lifecycle proof was not established.
- **BLOCKED** — an architecture or custody requirement is incomplete and prevents full audit conformance.

### Retained empirical browser evidence used

The most recent retained 3D Edit browser evidence immediately preceding this audit is the PR #1066 exact-head qualification:

- candidate head: `a3ceecb1c697e10e74456fd1c7b17628e24dd870`
- GitHub Actions run: `31594606299`
- job: `94107034127`
- focused splitter Node tests: **4/4 PASS**
- real Playwright Chromium: **3/3 PASS**
- workers: `1`
- retries: `0`
- trace: `on`
- artifact: `9140554055`
- artifact digest: `sha256:7377fd6902a1ec8b304be4c7d5e7f09ae09bc74afa817d477b344db251d7271b`

The three Chromium lifecycles were:

1. adjustable Engineering Table divider without engineering mutation;
2. certified S-007 support station relocation lifecycle;
3. certified S-007 restraint editing lifecycle.

That exact candidate was subsequently merged into the audited 3D Edit snapshot. This is **representative retained evidence**, not a blanket proof of every editor operation.

---

## 3. Executive verdict

### Verdict: **CONDITIONALLY ENGINEERING-READY — STRONG GOVERNED CORE; FULL 3D AUDIT CONFORMANCE BLOCKED**

The 3D Edit application has a strong engineering-authority foundation:

- canonical selection is revision/hash/session guarded;
- UI/interaction state is separated from engineering truth;
- governed commands carry deterministic basis information;
- certification resolves, regenerates, validates and hashes the candidate;
- acceptance is replay-checked against the certified candidate;
- journal Undo/Redo is canonical replay rather than a second UI-state Undo system;
- persistence/reload authority exists;
- rendered state is derived from canonical/runtime authority rather than meshes becoming canonical;
- Engineering Table capability and transaction paths are fail-closed and operation-specific;
- representative support edit lifecycles have real-browser evidence.

Full conformance is blocked by one architecture-level issue and several qualification gaps:

1. **P0 / A3D-001:** async validation response identity is incomplete. The worker contract has request/basis/plan/scope/topology identity, but does not explicitly carry the required source/session/selection/interaction identity bundle.
2. No single current-main visible browser proof yet covers the entire edit → Apply → exact Undo/Redo → Save → destroy/reopen → exact comparison lifecycle.
3. Cross-surface parity is demonstrated for selected paths, not systematically proven for every supported mutating operation.
4. Snap/numerical boundary behavior, whole-app accessibility, and large-model/long-session stability are not globally qualified from the evidence inspected here.

**Do not label the whole 3D editor “fully audited PASS” until A3D-001 and the Phase 1 qualification tasks in this document are closed.**

---

## 4. Scorecard

| Audit dimension | Status | Evidence | Disposition |
|---|---|---|---|
| Canonical engineering truth | **PASS** | STATIC-PRODUCTION | Keep invariant |
| Canonical selection identity | **PASS** | STATIC-PRODUCTION | Keep stale guards |
| Selection revision/hash/session custody | **PASS** | STATIC-PRODUCTION | Keep fail-closed |
| Operation eligibility/capability | **PASS-PARTIAL** | STATIC-PRODUCTION + representative EMPIRICAL-CHROMIUM | Expand parity matrix |
| Pointer/transient-state separation | **PASS-PARTIAL** | STATIC-PRODUCTION | Qualify every mutating family |
| Snap/constraint authority | **PARTIAL** | Incomplete audit evidence | A3D-006 |
| Ghost/preview non-mutation | **PASS-PARTIAL** | STATIC-PRODUCTION + support EMPIRICAL-CHROMIUM | A3D-004 |
| Governed command planning | **PASS** | STATIC-PRODUCTION | Keep planner as sole route |
| Certification/compatibility | **PASS** | STATIC-PRODUCTION | Keep replay-equality guard |
| Atomic transaction | **PASS** | STATIC-PRODUCTION | Expand operation matrix |
| Canonical topology/journal | **PASS** | STATIC-PRODUCTION + TEST-SOURCE | Preserve one journal |
| Undo/Redo exact replay | **PASS-PARTIAL** | TEST-SOURCE + support EMPIRICAL-CHROMIUM | A3D-005 |
| Rendering as projection | **PASS-PARTIAL** | STATIC-PRODUCTION; strongest on SJSON authority path | A3D-004/A3D-008 |
| Save/reopen implementation | **IMPLEMENTED** | STATIC-PRODUCTION | Needs complete browser proof |
| Save/reopen qualification | **NOT-QUALIFIED** | No complete retained visible lifecycle found | A3D-002 |
| Cross-surface parity | **PARTIAL** | STATIC-PRODUCTION + selected Table evidence | A3D-003 |
| Async response identity custody | **BLOCKED** | STATIC-PRODUCTION | **A3D-001 P0** |
| Numerical edge cases | **NOT FULLY QUALIFIED** | Incomplete audit evidence | A3D-006 |
| Whole-app accessibility | **PARTIAL** | Splitter qualified; editor-wide proof absent | A3D-007 |
| Large-model/long-session stability | **NOT FULLY QUALIFIED** | Test sources exist, complete current proof not established | A3D-008 |
| Permanent exact-head editor gate | **GAP** | Qualification has been slice-specific | A3D-009 |

---

## 5. Full lifecycle audit

### 5.1 Observe

**Audit question:** what model is being observed, and can the user-visible object be traced back to engineering authority?

**Observed production evidence**

- SJSON runtime authority constructs semantic runtime state and canonical topology from the source model.
- visual state is derived from canonical/runtime state via visual derivation/projection paths.
- source writeback is guarded and followed by reparse/hash checks.
- renderer refresh re-derives visual state rather than treating renderer objects as engineering truth.

Representative evidence:

- `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`
- `src/workspace/topology-edit-3d-view-controller-core.js`

**Result:** **PASS-PARTIAL / STATIC-PRODUCTION**

**Qualification limit:** the strongest inspected authority path is SJSON. This audit does not certify every possible renderer/import backend.

---

### 5.2 Identify canonical entity

**Audit question:** when the user selects an object, is the result a canonical engineering identity or merely a Three/mesh object?

**Observed production evidence**

- selection events carry canonical identity and revision/hash/session guards;
- selection state is stored as editor state, but engineering truth is not transferred into the Zustand store;
- stale selection is detectable using canonical revision/basis information.

Representative evidence:

- `src/workspace/topology-edit/editor-state/topology-edit-selection-events.js`
- `src/workspace/topology-edit/editor-state/topology-edit-editor-store.js`
- `src/workspace/topology-edit-3d-view-controller-core.js`

**Result:** **PASS / STATIC-PRODUCTION**

**Required invariant:** renderer UUID/object identity must never replace canonical entity ID/revision as command authority.

---

### 5.3 Attempt operation / operation eligibility

**Audit question:** before editing, does the application determine whether this exact canonical entity supports the requested operation?

**Observed production evidence**

- Engineering Table edit capability is explicit and operation-specific;
- unsupported operations return blocked/read-only reasons rather than falling through to generic mutation;
- support restraint and same-host station relocation are explicit certified operation families;
- support host rebinding and unsupported parent support geometry remain fail-closed.

Representative evidence:

- `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
- `src/workspace/topology-edit/table/topology-edit-table-transaction.js`

**Result:** **PASS-PARTIAL**

**Empirical evidence:** support station and restraint paths passed representative visible Chromium lifecycles.

**Gap:** there is not yet one generated matrix proving eligibility equivalence across every UI surface and mutating command family.

---

### 5.4 Inspect transient interaction / HUD draft

**Audit question:** does pointer/keyboard movement create transient interaction state without changing canonical topology?

**Observed production evidence**

- interaction session state is separate from canonical model state;
- interaction runtime derives transient candidate/preview state;
- inspected interaction controller paths route accepted edits through the governed planning/application path rather than direct topology writes.

Representative evidence:

- `src/workspace/viewport-productivity/topology-edit-interaction-session.js`
- `src/workspace/viewport-productivity/topology-edit-interaction-controller-runtime.js`
- `src/workspace/topology-edit-3d-interaction-controller.js`

**Result:** **PASS-PARTIAL / STATIC-PRODUCTION**

**Qualification need:** every pointer-driven mutating operation must have a test proving repeated `pointermove` events leave canonical/source/journal hashes unchanged until Apply.

---

### 5.5 Snap / constraint

**Audit question:** is snapping deterministic, operation-specific, finite, and separated from canonical mutation?

**Result:** **PARTIAL / NOT FULLY QUALIFIED**

This audit did not establish complete current-main evidence for all snap policy sources and numerical boundary cases.

**Required closure:** A3D-006.

---

### 5.6 Ghost / Preview

**Audit question:** is the ghost derived from the same candidate that will be governed and applied, while remaining non-mutating?

**Observed production evidence**

- Table workflow has explicit Stage → Preview → Validate → Apply boundaries;
- support placement/restraint preview geometry is composed through governed projection paths;
- prior exact-head support browser evidence checked that Stage/Preview/Validate did not mutate canonical/source/journal state;
- the visible candidate is discarded/rebuilt around governed state rather than becoming canonical by display.

Representative evidence:

- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
- `e2e/topology-edit-table-support-placement.spec.js`
- `e2e/topology-edit-table-support-restraint.spec.js`

**Result:** **PASS-PARTIAL**

**Gap:** preview/applied equivalence is not yet systematically measured for every mutating command family.

---

### 5.7 Inspect governed command

**Audit question:** does every engineering mutation become a deterministic governed command with basis custody?

**Observed production evidence**

- command contracts carry deterministic source/base/draft/session basis;
- command resolution and candidate regeneration occur before acceptance;
- certification validates the regenerated candidate and hashes the result;
- certified acceptance verifies replay equality rather than trusting a caller-supplied object.

Representative evidence:

- `src/workspace/topology-edit/topology-edit-command-contract.js`
- `src/workspace/topology-edit/topology-edit-certification-service.js`
- `src/workspace/topology-edit/topology-edit-certified-session.js`

**Result:** **PASS / STATIC-PRODUCTION**

**Required invariant:** no UI surface may bypass planner/certification with a direct canonical mutation.

---

### 5.8 Compatibility / async validation

**Audit question:** can an asynchronous result be accepted only for the exact source/basis/session/selection/interaction/request that produced it?

**Observed production evidence**

The validation worker contract/client includes strong deterministic identity for:

- `requestId`;
- basis hash;
- plan hash;
- changed-scope hash;
- topology hash;
- previous-issue hash.

However, the inspected worker request/response contract does **not explicitly carry the complete identity bundle required by this editor's governance rule**:

- source hash;
- session ID/version;
- selection revision;
- interaction ID.

The Table caller performs additional preview/topology stale checks after the response, which is valuable but does not replace end-to-end response identity custody.

Representative evidence:

- `src/workspace/topology-edit/professional/topology-edit-validation-worker-contract.js`
- `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js`
- `src/workspace/topology-edit/professional/topology-edit-operation-plan.js`
- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`

**Result:** **BLOCKED — A3D-001**

---

### 5.9 Apply / atomic transaction

**Audit question:** is the accepted operation applied once, atomically, through the governed transaction path?

**Observed production evidence**

- certification/application is separated from Stage/Preview/Validate;
- Table Apply uses governed planner/transaction routes;
- accepted replay is required to match the certified candidate;
- the engineering journal records the accepted transaction sequence.

Representative evidence:

- `src/workspace/topology-edit/topology-edit-certified-session.js`
- `src/workspace/topology-edit/table/topology-edit-table-transaction.js`
- `src/workspace/topology-edit/topology-edit-journal-service.js`

**Result:** **PASS / STATIC-PRODUCTION**

---

### 5.10 Inspect canonical topology

**Audit question:** after Apply, is the canonical topology the engineering result, with deterministic revisions/dependencies and no mesh-derived truth?

**Observed production evidence**

- journal/model state is canonical;
- visual refresh is downstream of canonical state;
- support station/restraint transactions preserve source/vendor evidence while storing explicit certified override authority;
- representative support browser tests exercise Apply/Undo/Redo around canonical support state.

**Result:** **PASS-PARTIAL**

**Gap:** a general changed-scope/topology invariant harness is needed for every command family, especially connectivity-changing operations.

---

### 5.11 Inspect rendering

**Audit question:** does rendering project canonical truth, and can renderer rebuilds occur without changing engineering state?

**Observed production evidence**

- SJSON authority derives visual state from canonical/runtime data;
- renderer refresh does not define engineering identity;
- support preview/application paths use shared governed geometry/projection functions;
- the splitter interaction is a useful negative-control proof: a visible layout mutation changes only transient UI/CSS state and does not touch engineering authority.

Representative evidence:

- `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`
- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
- `src/workspace/viewport-productivity/topology-edit-table-splitter-runtime.js`
- `e2e/topology-edit-table-splitter.spec.js`

**Result:** **PASS-PARTIAL**

**Gap:** add renderer remount/visibility/isolate/LOD-style stress to A3D-008.

---

### 5.12 Undo

**Audit question:** does Undo restore exact canonical state through the engineering journal rather than a Zustand/UI snapshot?

**Observed evidence**

- the journal service reconstructs state from baseline + accepted command history;
- editor Zustand is not a second engineering Undo store;
- `tests/topology-edit-wave1-journal-replay.test.mjs` exercises certified commands and journal replay;
- representative support browser lifecycles check exact pre-transaction support restoration after Undo.

**Result:** **PASS-PARTIAL**

The journal algebra is strong; the remaining gap is an operation-wide exact-state matrix and reopen equivalence.

---

### 5.13 Redo

**Audit question:** does Redo restore the exact previously applied canonical state?

**Observed evidence**

- journal replay supports deterministic redo;
- test source validates repeated Undo/Redo sequences;
- representative support browser lifecycles restore the applied support state after Redo.

**Result:** **PASS-PARTIAL**

**Required closure:** A3D-005.

---

### 5.14 Save / reopen

**Audit question:** can the user persist the governed state, destroy/reopen the editor, and recover exactly the same engineering authority?

**Observed production evidence**

- `TopologyEditLifecycleController.saveDraft()` writes through persistence authority;
- `reloadDraft()` validates revision/source/basis before reinstating session state;
- the 3D view controller exposes save/reload/commit lifecycle controls;
- persistence packages are deterministic and basis-aware.

Representative evidence:

- `src/workspace/topology-edit/topology-edit-persistence.js`
- `src/workspace/topology-edit/topology-edit-lifecycle-controller.js`
- `src/workspace/topology-edit-3d-view-controller.js`

**Implementation result:** **IMPLEMENTED / STATIC-PRODUCTION**

**Qualification result:** **NOT-QUALIFIED**

No single retained current-stack real-browser test was established by this audit that performs:

`visible edit → Preview → Validate → Apply → Undo → Redo → Save → destroy/remount → Reload → exact canonical/source/journal/render comparison`.

**Required closure:** A3D-002.

---

### 5.15 Repeat through another UI surface

**Audit question:** do viewport, Engineering Table, tree/context actions and properties/HUD routes converge on the same canonical entity, capability and governed command?

**Observed production evidence**

- Table/canvas coordinator connects Table selection with canonical/view selection;
- Table uses explicit capability and transaction routes;
- viewport interaction controller also routes through governed interaction/planning/application authority.

Representative evidence:

- `src/workspace/viewport-productivity/topology-edit-table-canvas-coordinator.js`
- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
- `src/workspace/topology-edit-3d-interaction-controller.js`

**Result:** **PARTIAL**

There is selected-path evidence, but no systematic operation × UI-surface parity matrix.

**Required closure:** A3D-003.

---

## 6. Representative audited user paths

### 6.1 Certified support station relocation — representative visible PASS

Known browser path:

`Workspace → XYZ fixture → 3D Edit → Engineering Table → select S-007 → edit station → Stage → Preview → Validate → Apply → Undo → Redo`

Representative certified result previously evidenced:

- support: `S-007`
- host: `P-011`
- source station: `400 mm`
- requested station: `500 mm`
- host length: `800 mm`
- segment parameter: `0.625`
- certified authority: `CERTIFIED_TABLE_OVERRIDE`
- Stage/Preview/Validate: canonical/source/journal unchanged
- Apply: one governed support placement result
- Undo: exact baseline support
- Redo: exact applied support
- source semantic/byte evidence retained

**Audit disposition:** representative **EMPIRICAL-CHROMIUM PASS** for the path, not a blanket editor pass.

### 6.2 Certified support restraint editing — representative visible PASS

Known browser path:

`Workspace → XYZ fixture → 3D Edit → Engineering Table → select S-007 → edit restraint family/direction/gap/travel → Stage → Preview → Validate → Apply → Undo → Redo`

Representative request:

- family: `LINE_STOP`
- direction: `+X`
- gap: `5`
- travel: `20`

Observed retained evidence:

- Stage/Preview/Validate non-mutating;
- governed restraint ghost visible;
- Apply creates certified restraint override;
- source hashes retained;
- Undo exact baseline;
- Redo exact applied.

**Audit disposition:** representative **EMPIRICAL-CHROMIUM PASS** for the path.

### 6.3 Generic viewport direct interaction — architecture PASS, global browser proof incomplete

The inspected viewport interaction architecture separates transient session/preview from canonical application and routes accepted work through governed planning/application.

**Audit disposition:** **STATIC-PRODUCTION PASS-PARTIAL**. Do not infer global viewport UI coverage from direct controller code or controller tests.

### 6.4 Engineering Table splitter — negative-control PASS

The adjustable divider is deliberately UI-only:

`pointer/keyboard separator interaction → bounded transient detail-pane height → CSS flex-basis`

It does not call canonical selection mutation, Stage, Preview, Validate, Apply, planner, journal, source writeback or Three engineering mutation.

**Audit value:** this is a useful negative-control demonstrating the codebase can keep presentation state outside engineering authority.

---

# 7. Actionable findings

## A3D-001 — P0 — Complete async validation identity custody

### Status

**BLOCKER**

### Problem

The validation worker has good deterministic request/basis/plan/scope/topology custody, but the inspected contract does not explicitly bind every response to the full engineering interaction identity required for safe acceptance.

A stale response must never be accepted merely because its topology/plan still appears compatible.

### Required identity bundle

Every asynchronous validation request and response must carry, at minimum:

```text
sourceHash
basisHash
sessionId
sessionVersion
selectionRevision
interactionId
requestId
```

Existing deterministic plan/scope/topology hashes remain in addition to this bundle.

### Implementation direction

Primary files:

- `src/workspace/topology-edit/professional/topology-edit-validation-worker-contract.js`
- `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js`
- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
- any viewport/professional caller that submits or consumes validation worker results

Implementation rules:

- capture the identity bundle at request creation;
- make the request object immutable;
- worker response must echo the exact bundle unchanged;
- client must validate all identity fields **before** interpreting issues/readiness;
- missing identity field is invalid, not backward-compatible acceptance;
- no timestamp/random ID may be introduced;
- existing basis/plan/scope/topology stale checks stay in place;
- reject response on the first mismatched identity dimension with a deterministic stale reason.

### Required tests

Create/extend focused contract/client tests so each dimension is independently stale:

- source hash mismatch;
- basis hash mismatch;
- session ID mismatch;
- session version mismatch;
- selection revision mismatch;
- interaction ID mismatch;
- request ID mismatch;
- plan hash mismatch;
- changed-scope mismatch;
- topology hash mismatch;
- missing identity field.

Also add a browser race test:

1. start validation for interaction A;
2. change selection or begin interaction B before A resolves;
3. resolve A after B is active;
4. assert A cannot update validation UI, enable Apply, change ghost, mutate canonical state or enter the journal.

### Definition of Done

- [ ] No async validation response acceptance path exists without all seven identity fields.
- [ ] Each field is tested independently for stale rejection.
- [ ] Missing field fails closed.
- [ ] Stale response cannot change readiness, preview, Apply eligibility, canonical state, source state or journal.
- [ ] Existing planner/certification guards remain intact.
- [ ] Exact-head Node + real Chromium race qualification passes with zero retries.

---

## A3D-002 — P1 — Qualify one complete visible save/reopen lifecycle

### Status

**IMPLEMENTED BUT NOT FULLY QUALIFIED**

### Goal

Prove the whole authority chain in one real user journey rather than in separate unit/controller slices.

### Proposed test

`e2e/topology-edit-full-audit-lifecycle.spec.js`

### Required visible flow

```text
Open Workspace
→ load deterministic fixture
→ enter 3D Edit
→ select a canonical entity through visible UI
→ perform a supported engineering edit
→ Stage
→ Preview
→ Validate
→ Apply
→ inspect canonical and rendered result
→ Undo
→ verify exact baseline
→ Redo
→ verify exact applied state
→ Save
→ destroy/remount or close/reopen editor
→ Reload saved draft
→ verify exact applied state again
→ select/edit through a second UI surface
```

### Required assertions

Before Apply:

- canonical hash unchanged;
- source hash unchanged;
- journal unchanged;
- ghost exists only while appropriate;
- transient interaction state is not persisted.

After Apply:

- changed scope is exactly the certified scope;
- canonical topology hash matches certified candidate;
- renderer projection matches the applied canonical result;
- one atomic journal transaction is added.

Undo/Redo:

- Undo deep-equals exact baseline engineering state;
- Redo deep-equals exact applied engineering state.

Save/Reopen:

- source/basis custody is validated;
- exact canonical applied state is restored;
- exact journal authority required by the persistence contract is restored;
- renderer is regenerated from restored engineering state;
- no ghost/transient drag state survives reload;
- corrupted or stale persistence basis fails closed.

### Definition of Done

- [ ] Real Chromium, one worker, zero retries.
- [ ] Trace-on evidence.
- [ ] Machine-readable exact candidate SHA in artifact.
- [ ] No direct controller invocation is used as a substitute for user interaction.
- [ ] Exact canonical/source/journal comparisons are retained in evidence.
- [ ] Save/reopen is no longer marked NOT-QUALIFIED in this audit.

---

## A3D-003 — P1 — Build a cross-surface authority parity matrix

### Status

**PARTIAL**

### Goal

Prove that every supported UI surface is only a different way to request the **same governed engineering operation**.

### Required matrix

For each mutating operation family, test applicable surfaces:

| Operation family | Viewport | Engineering Table | Tree/context | Properties/HUD |
|---|---:|---:|---:|---:|
| Node position | qualify | qualify | qualify/blocked | qualify/blocked |
| Support station | qualify/blocked | qualify | qualify/blocked | qualify/blocked |
| Support restraint | qualify/blocked | qualify | qualify/blocked | qualify/blocked |
| Catalogue/component selection | qualify | qualify | qualify/blocked | qualify/blocked |
| Connectivity/topology operation | qualify | qualify/blocked | qualify/blocked | qualify/blocked |
| Other certified mutating families | generated from registry | generated from registry | generated from registry | generated from registry |

Do not hard-code “supported” where the product intentionally blocks a surface. Unsupported cells must assert the exact fail-closed reason.

### For every supported cell assert

- same canonical entity ID and revision basis;
- same capability/eligibility outcome;
- same command family;
- same planner/certification route;
- same changed-scope semantics;
- same final topology hash for semantically identical input;
- no per-surface direct mutation path.

### Proposed browser test

`e2e/topology-edit-cross-surface-parity.spec.js`

### Definition of Done

- [ ] Matrix is generated from actual capability/operation registry where possible.
- [ ] Every supported surface converges on governed authority.
- [ ] Every unsupported surface produces explicit blocked reason.
- [ ] No surface owns a private engineering Undo stack.
- [ ] No direct mutation route exists solely for one UI surface.

---

## A3D-004 — P1 — Add ghost-to-applied differential qualification

### Status

**PASS-PARTIAL; SYSTEMATIC PROOF MISSING**

### Goal

For every mutating command family, prove the visible Preview is the projection of the same governed candidate that Apply commits.

### Reusable harness contract

For a candidate operation:

1. capture baseline canonical/source/journal hashes;
2. Stage;
3. Preview;
4. assert baseline authority unchanged;
5. capture candidate topology hash, changed scope and projection signature;
6. Validate;
7. Apply;
8. assert final canonical topology equals certified candidate;
9. assert applied renderer projection equals the governed candidate projection within declared renderer policy;
10. assert only intended scope changed.

### Important rule

Do not compare screenshots only. Compare semantic geometry/projection records wherever available and use screenshot/trace evidence as supplemental proof.

### Definition of Done

- [ ] Reusable helper exists.
- [ ] Every mutating command family participates.
- [ ] Stage/Preview/Validate are proven non-mutating.
- [ ] Ghost candidate and applied candidate share deterministic governing identity.
- [ ] Unexpected changed scope fails the test.

---

## A3D-005 — P1 — Exact Undo/Redo/Reopen matrix for every mutating command

### Status

**JOURNAL CORE PASS; COVERAGE MATRIX INCOMPLETE**

### Existing foundation

`tests/topology-edit-wave1-journal-replay.test.mjs` already exercises deterministic certified-session journal replay.

### Required operation contract

For each mutating command family:

```text
A = exact baseline canonical/source state
B = exact applied canonical/source state
Apply: A → B
Undo: B → exact A
Redo: A → exact B
Save/Reopen after Redo: exact B
```

Include imported/vendor evidence and explicit override fields in equality assertions. Do not use “position approximately returned” as the primary correctness criterion.

### Definition of Done

- [ ] Every mutating command appears in the matrix.
- [ ] Undo deep-equals baseline semantic state.
- [ ] Redo deep-equals applied semantic state.
- [ ] Reopen deep-equals applied semantic state.
- [ ] One canonical journal remains the only engineering Undo authority.
- [ ] Renderer rebuild after Undo/Redo/Reopen derives from canonical state.

---

## A3D-006 — P1 — Numerical and snapping boundary qualification

### Status

**NOT FULLY QUALIFIED**

### Required numerical matrix

Cover at least:

- zero and near-zero lengths;
- snap tolerance at `threshold - ε`, `threshold`, `threshold + ε`;
- coincident/near-coincident nodes;
- very large coordinates;
- very small engineering deltas;
- local vs global axes;
- unit conversion boundaries;
- station parameter at `0`, `1`, and immediately outside bounds;
- angular wrap/boundaries where relevant;
- repeated deterministic edit cycles from identical starting state;
- invalid/non-finite numeric inputs.

### Required assertions

- no NaN/Infinity enters canonical state;
- identical input + identical basis produces identical candidate/hash;
- snap decision is deterministic and operation-specific;
- tolerance policy cannot silently create topology outside the permitted command;
- out-of-range values fail closed with deterministic reason;
- unit conversion does not change identity or connectivity semantics.

### Definition of Done

- [ ] Boundary matrix is executable in Node for pure policy logic.
- [ ] Critical snapping cases are repeated in real Chromium.
- [ ] No random/timestamp-derived behavior.
- [ ] Determinism is asserted across repeated runs.

---

## A3D-007 — P2 — Whole-app accessibility qualification

### Status

**PARTIAL**

The Engineering Table splitter has real keyboard/ARIA qualification, but that does not establish accessibility of the whole editor.

### Required audit areas

- toolbar focus order;
- object tree focus/selection semantics;
- Engineering Table keyboard navigation;
- properties/HUD labels and errors;
- visible focus indication;
- disabled/blocked reason exposure;
- Escape/cancel semantics;
- separator/gizmo alternatives where practical;
- `aria-selected`, `aria-disabled`, names and roles;
- no focus trap when entering/leaving 3D Edit;
- dialogs/menus restore focus correctly.

Automated accessibility scanning may supplement the audit, but manual Playwright keyboard assertions are required.

### Definition of Done

- [ ] Complete keyboard walkthrough documented and automated for non-spatial controls.
- [ ] Blocked operation reasons are available without relying solely on color/hover.
- [ ] Focus survives normal rerenders.
- [ ] No blanket claim that pointer-only spatial gestures are keyboard accessible unless an alternative is actually implemented.

---

## A3D-008 — P2 — Large-model and long-session identity/renderer soak

### Status

**NOT FULLY QUALIFIED**

### Deterministic soak fixture

Create or reuse a deterministic large engineering fixture with enough entities to exercise:

- renderer object reuse/rebuild;
- table virtualization;
- selection under load;
- visibility/isolate;
- clipping where applicable;
- repeated previews;
- asynchronous validation races;
- long journal histories.

### Soak sequence

At minimum:

1. rapid selection across many entities;
2. table scroll/virtualization and selection synchronization;
3. repeated visibility/isolate toggles;
4. repeated viewport rerenders/remounts;
5. at least 100 governed Apply/Undo/Redo cycles across deterministic supported edits;
6. repeated Preview/cancel cycles without Apply;
7. deliberate stale async responses;
8. save/reopen after long journal history.

### Required assertions

- canonical entity IDs/revisions do not drift;
- entity/topology counts remain consistent with intended commands;
- no duplicate rendered projection for one canonical entity unless explicitly designed;
- selection still resolves to canonical identity after rerender/remount;
- transient preview objects are removed after cancel/apply;
- stale async results are rejected;
- event listeners/subscriptions do not accumulate where measurable;
- memory growth is bounded where instrumentation is available.

### Definition of Done

- [ ] Deterministic fixture and test exist.
- [ ] Test records exact starting/ending authority hashes.
- [ ] No retries hide intermittent identity failures.
- [ ] Trace/artifacts retained for failure diagnosis.

---

## A3D-009 — P1 — Establish a permanent exact-head 3D Editor qualification gate

### Status

**GAP**

The repository contains many useful 3D Edit E2E sources, but qualification has often been slice-specific. The app needs a permanent high-signal gate that proves the engineering editor authority chain on every relevant change.

### Minimum gate

Trigger for changes touching 3D Edit authority, interaction, persistence, Table/canvas coordination, topology command/certification, renderer projection, or validation workers.

The gate should:

- checkout the exact PR head SHA;
- emit a machine-readable run identity containing exact SHA;
- run focused deterministic Node authority tests;
- run real Chromium with one worker and zero retries for qualification cases;
- retain trace-on artifacts;
- run the complete A3D-002 lifecycle;
- run representative cross-surface parity cases;
- run stale async response rejection;
- run at least one connectivity/topology-changing operation if supported;
- assert changed-file/source line guards separately from application behavior.

### Definition of Done

- [ ] Exact-head identity is part of the artifact.
- [ ] Browser evidence cannot be confused with another commit.
- [ ] Direct controller invocation is not counted as visible UI coverage.
- [ ] A failing authoritative lifecycle prevents merge readiness.
- [ ] No test retries are used to convert nondeterminism into a PASS.

---

## 8. Implementation order

### Phase 0 — remove the architecture blocker

1. **A3D-001 — async validation identity custody**

Do not broaden engineering mutation capability before this is closed if the new capability depends on asynchronous validation.

### Phase 1 — establish full engineering lifecycle qualification

2. **A3D-002 — full visible save/reopen lifecycle**
3. **A3D-004 — ghost/applied differential harness**
4. **A3D-005 — exact Undo/Redo/Reopen matrix**
5. **A3D-003 — cross-surface parity matrix**
6. **A3D-009 — permanent exact-head qualification gate**

Phase 1 converts strong architecture into repeatable product evidence.

### Phase 2 — harden numerical, accessibility and scale behavior

7. **A3D-006 — numerical/snapping boundaries**
8. **A3D-007 — whole-app accessibility**
9. **A3D-008 — large-model/long-session soak**

---

## 9. Definition of Full 3D Audit PASS

The 3D Edit application may be called **FULL 3D AUDIT PASS** only when all of the following are true on one exact candidate revision:

### Canonical authority

- [ ] Every selectable engineering object resolves to canonical identity/revision.
- [ ] No mesh/Three object is canonical engineering truth.
- [ ] Renderer remount does not change canonical state.

### Eligibility and interaction

- [ ] Every mutating operation has explicit eligibility/capability.
- [ ] Unsupported/ambiguous cases fail closed with deterministic reasons.
- [ ] Pointermove/drag updates transient state only until governed Apply.
- [ ] Snap/constraint policy is deterministic and boundary-qualified.

### Preview and command governance

- [ ] Preview is non-mutating.
- [ ] Preview candidate is traceably the candidate certified/applied.
- [ ] Every mutation goes through governed planner/certification.
- [ ] No UI-specific bypass exists.

### Async safety

- [ ] Every async response is bound to source/basis/session/selection/interaction/request identity.
- [ ] Missing/mismatched identity fails closed.
- [ ] Stale responses cannot alter readiness, ghost, canonical state or journal.

### Transaction/topology

- [ ] Apply is atomic.
- [ ] Changed scope equals certified changed scope.
- [ ] Connectivity/incidence/host/dependency invariants are checked after topology-changing operations.

### Projection

- [ ] Visible applied geometry is derived from canonical state.
- [ ] Ghost/applied differential is qualified for all mutating command families.
- [ ] visibility/isolate/rerender/remount cannot change engineering truth.

### Undo/Redo

- [ ] One canonical engineering journal is the Undo/Redo authority.
- [ ] Undo restores exact baseline semantic state.
- [ ] Redo restores exact applied semantic state.

### Persistence

- [ ] Save/reopen restores exact governed state.
- [ ] transient ghost/interaction state is not serialized as canonical engineering truth.
- [ ] stale/corrupted persistence basis fails closed.

### Cross-surface parity

- [ ] Supported viewport/Table/tree/properties routes converge on the same canonical capability and command semantics.
- [ ] Unsupported surfaces explicitly block rather than mutate differently.

### Product qualification

- [ ] Real Chromium exact-head lifecycle passes with zero retries.
- [ ] Trace + machine-readable exact-SHA artifact retained.
- [ ] Numerical boundaries pass.
- [ ] whole-app accessibility acceptance passes.
- [ ] deterministic large-model/long-session soak passes.

Until all boxes above are proven, the correct status is **conditionally engineering-ready**, not globally “fully qualified.”

---

## 10. Evidence index

### Canonical selection / editor state

- `src/workspace/topology-edit/editor-state/topology-edit-selection-events.js`
- `src/workspace/topology-edit/editor-state/topology-edit-editor-store.js`
- `src/workspace/topology-edit-3d-view-controller-core.js`

### Interaction / transient state

- `src/workspace/viewport-productivity/topology-edit-interaction-session.js`
- `src/workspace/viewport-productivity/topology-edit-interaction-controller-runtime.js`
- `src/workspace/topology-edit-3d-interaction-controller.js`

### Governed command / certification

- `src/workspace/topology-edit/topology-edit-command-contract.js`
- `src/workspace/topology-edit/topology-edit-certification-service.js`
- `src/workspace/topology-edit/topology-edit-certified-session.js`

### Journal / Undo / Redo

- `src/workspace/topology-edit/topology-edit-journal-service.js`
- `tests/topology-edit-wave1-journal-replay.test.mjs`

### Persistence / reopen

- `src/workspace/topology-edit/topology-edit-persistence.js`
- `src/workspace/topology-edit/topology-edit-lifecycle-controller.js`
- `src/workspace/topology-edit-3d-view-controller.js`

### Rendering/runtime authority

- `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`

### Engineering Table / cross-surface authority

- `src/workspace/viewport-productivity/topology-edit-table-canvas-coordinator.js`
- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
- `src/workspace/topology-edit/table/topology-edit-table-transaction.js`
- `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`

### Async validation

- `src/workspace/topology-edit/professional/topology-edit-validation-worker-contract.js`
- `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js`
- `src/workspace/topology-edit/professional/topology-edit-operation-plan.js`

### Representative visible E2E sources

- `e2e/topology-edit-table-support-placement.spec.js`
- `e2e/topology-edit-table-support-restraint.spec.js`
- `e2e/topology-edit-table-splitter.spec.js`

### Wider E2E inventory present in repository

Examples include:

- `e2e/topology-edit-3d-interaction.spec.js`
- `e2e/topology-edit-direct-manipulation.spec.js`
- `e2e/topology-edit-engineering-table.spec.js`
- `e2e/topology-edit-engineering-table-node-position.spec.js`
- `e2e/topology-edit-engineering-table-viewport-drag.spec.js`
- `e2e/topology-edit-human-workflow.spec.js`
- `e2e/topology-edit-human-workflow-mutation.spec.js`
- `e2e/topology-edit-professional-regression.spec.js`
- `e2e/topology-edit-ghost-after-newly-enabled-edit.spec.js`
- `e2e/topology-edit-sjson-import.spec.js`
- `e2e/topology-edit-ui-audit.spec.js`

Their presence is useful evidence of intended coverage, but **test-source existence is not equivalent to current exact-head execution**.

---

## 11. Explicit non-claims

This audit intentionally does **not** claim any of the following without direct evidence:

- that every 3D Edit E2E source currently passes;
- that every renderer/import backend has been fully audited;
- that every pointer-driven operation is currently browser-qualified;
- that save/reopen has a complete current-main visible lifecycle PASS;
- that cross-surface parity is complete;
- that snapping/numerical boundaries are complete;
- that whole-app accessibility is complete;
- that large-model/long-session behavior is complete;
- that direct controller invocation proves visible UI behavior.

The strongest current conclusion is:

> **The 3D Edit app has a strong governed engineering core and representative real-browser evidence, but full product-level audit conformance requires closure of A3D-001 and the Phase 1 lifecycle qualification work.**
