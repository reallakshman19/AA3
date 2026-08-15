# PR1151 — Empirical Calc V3 Safety & Evidence Work Report

## Recovery / release header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: REVIEWED_AND_FIXED
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1149_OWNER_MISSION
MERGE_AUTHORITY: EXPLICIT_OWNER_AUTHORIZATION_RECEIVED_2026-08-15
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: issue #1149
PR: #1151
BRANCH: agent/empirical-v3-safety-evidence-fresh-20260815
MERGE_BASE: edafbbccbc7572f65192a048550406d2257d3def
CODE_HEAD_REVIEWED: 5235eea7385f49af98171a4d39788eb63355c35b
TAKEOVER_BASE_HEAD: c57dc4237ea128ae7967fc6ab6ae8cd1c087405c
TAKEOVER_QUALIFICATION_COMMENT: issuecomment-5302300784
TAKEOVER_SCORE: 97/100 CONTINUE
CURRENT_STAGE: STACK_SAFE_LANDING
CURRENT_BLOCKER: none in reviewed code; exact-head CI/browser execution remains NOT_RUN/NOT_OBSERVED
```

The commit containing this report is intentionally allowed to follow `CODE_HEAD_REVIEWED`; no production source change is permitted after that code head without reopening exact-head review.

## Stack relationship

PR #1151 is a fresh stack directly on #1148:

```text
#1145 source-bound straight thermal restraint ROM
  -> #1147 continuous B31J elbow flexibility
  -> #1148 canonical source-backed elbow geometry / mixed route
  -> #1151 safety, workflow, evidence, straight live execution bridge
```

#1150 is superseded and remains untouched.

At takeover review:

- #1145, #1147, #1148 and #1151 were all OPEN / DRAFT / mergeable / unmerged;
- exact stack identities were intact: #1147 base == #1145 head, #1148 base == #1147 head, #1151 base == #1148 head;
- current `main` was `04328852dced9f5c4827da8afe8a82aeb8b1a1d3`;
- main drift since #1145 base was confined to #1146 InputXML/geometry diagnostics and had zero path overlap with #1145's 12 ROM/custody files.

## Owner-locked architecture preserved

```text
source/master/current model
-> engineering quantity authority
-> calculation branch/component authority
-> risk + singular HIGH_CONFIRM receipt
-> sealed calculation authorization
-> exact ROM execution request
-> unchanged qualified ROM
-> sealed coupled evidence
-> result review / audit readiness
-> governed JSON audit
```

Preserved invariants:

- no naked scalar is promoted to exact V3 engineering authority without provenance;
- exact topology remains required;
- HIGH_BLOCK has no confirmation route;
- HIGH_CONFIRM is singular and hash-bound;
- UI/report do not re-solve mechanics;
- no chainage-as-connectivity;
- no response multiplier or benchmark fitting;
- no frozen #1145/#1147/#1148 equation/tolerance/quadrature change;
- no V1/V2 production behavior change;
- mixed straight/elbow browser execution remains deliberately unwired.

## Takeover review

A live independent takeover qualification was recorded before mutation in PR comment `5302300784`:

- A1 production trace: 19/20;
- A2 failure isolation: 20/20;
- A3 authority/invariant: 20/20;
- A4 independent validation design: 18/20;
- A5 minimal patch: 20/20;
- total: **97/100 — CONTINUE**.

## Defects confirmed and fixed during takeover

### DEF-004 — class-name exactness could launder a non-exact component master row

The production `piping-class-resolver.js` can return `best-score` with `needsReview=false` while one or more row discriminators are missing, near or mismatched. The previous V3 bridge treated exact class name + non-ambiguous best-score as enough to promote component-derived wall/material/corrosion values.

Fix:

- split branch piping-class identity from component-row exactness;
- branch class identity may remain exact when the class match itself is exact/current;
- component-row exactness now additionally requires explicit row reasons:
  - `CLASS_EXACT`;
  - `BORE_EXACT`;
  - `COMPONENT_EXACT`;
  - `SCHEDULE_EXACT`;
- any `MISMATCH`, `MISSING` or `NEAR` row evidence prevents exact component-row promotion;
- wall/material authority uses component-row exactness, not class-name exactness.

### DEF-005 — corrosion exactness lacked the rating-aware row evidence used by the legacy resolver

`resolveBranchProcessData()` performs a second rating-aware master lookup for corrosion, but the returned record does not retain that lookup's row method/reasons. The previous bridge could call corrosion `APPROVED_MASTER_EXACT` using evidence from a different row decision.

Fix:

- corrosion from this legacy seam is now `INFERRED_REVIEW_REQUIRED / HIGH_CONFIRM`;
- master provenance is retained when available;
- exact corrosion may be restored only after the rating-aware lookup evidence is preserved and qualified.

### DEF-006 — generic exact reference promotion did not require immutable source hash

`adaptResolutionReference()` could promote a caller-declared exact master/source reference without a `sourceSemanticHash`.

Fix:

- `SOURCE_EXACT` / `APPROVED_MASTER_EXACT` require immutable source semantic hash;
- missing exact evidence downgrades to `INFERRED_REVIEW_REQUIRED`;
- exact records cannot remain `needsReview`;
- non-exact records must remain `needsReview`;
- rehydration validates these semantics, so a forged self-consistent exact record with null source hash is rejected.

### DEF-007 — reviewed master values could point at the wrong provenance hash

When a master-derived value was downgraded to review-required, some paths could bind the line/source hash instead of the master revision.

Fix:

- master-derived wall, piping-class material code and corrosion keep `masterSemanticHash` even when not exact;
- exactness and provenance are independent dimensions.

### DEF-008 — live straight V3 Run could retain stale package/preparation after governing workspace changes

The contracts could reject stale current authorization when explicitly reconciled, but the live shell did not automatically invalidate a prepared request/package when dataset/model/master/project authority changed. A stale package could therefore remain operationally available.

Fix in `src/main.js`:

- subscribe to `WORKSPACE_SNAPSHOT_CHANGED` and invalidate V3 prepared/package/evidence state when dataset basis changes;
- invalidate on `project-data-changed` / `master-data-changed` engineering-model events;
- bind both preparation and direct execution to the current active workspace using the already-sealed execution dependency:
  - dataset id;
  - source snapshot semantic hash;
  - active shared-model semantic hash;
- `preparedExecutionMatchesPackage()` additionally requires the dependency to match the active workspace, so Run disables even before a downstream package refresh;
- teardown unsubscribes the new listeners.

This is fail-closed. Current UI clears stale state; preserving stale records visibly is a WP2/#1152 UX follow-on, not an authorization bypass.

## Regression additions

### `scripts/empirical-v3-branch-process-resolution-adapter-check.mjs`

Added cases for:

- exact class + exact bore/component/schedule row;
- exact class but missing component discriminator;
- bore-near row;
- schedule-unproven row;
- fuzzy class;
- missing master evidence;
- default-zero wall;
- corrosion remaining review-required when rating-aware lookup evidence is absent.

### `scripts/empirical-v3-source-authority-adapter-check.mjs`

Added cases for:

- exact reference with immutable source hash;
- exact requested without source hash -> review-required;
- forged exact record with null source hash -> rejected;
- unresolved reference always review-required.

### `scripts/empirical-v3-safety-ui-source-guard.mjs`

Added source guards requiring:

- workspace snapshot invalidation wiring;
- project/master authority invalidation wiring;
- prepared/package clearing on governing changes;
- active dataset id/source/shared-model matching before preparation/run;
- mixed execution remains absent from browser runtime.

## Validation ledger

### Previously observed targeted execution — PASS / LOCAL_EXECUTION

The prior exact dependency-closure execution recorded in this PR remains valid for unchanged modules:

- workflow state projection;
- quantity authority core;
- risk / confirmation / calculation authorization core;
- engineering-event contract;
- branch/component authority core;
- coupled evidence;
- result review / audit orchestration;
- source-bound straight authorized execution bridge;
- mixed producer / bridge frozen benchmark and non-UI orchestration;
- StagedJSON process basis;
- canonical #1148 mixed-route oracle.

Frozen mixed benchmark previously observed:

```text
Fxx =  3.0214810087147532e-5 m/N
Fxy = -1.0064363521234054e-5 m/N
Fyy =  5.976702305296452e-6 m/N
Rx  = -606.8995590818411 N
Ry  = -1523.926961429032 N
```

No takeover patch touched those mechanics.

### Takeover exact-head checks — NOT_RUN / NOT_OBSERVED

The updated files and committed regressions above have been source-reviewed but could not be executed in a complete checkout from this environment. Therefore the following are **not** called PASS:

- updated `empirical-v3-branch-process-resolution-adapter-check.mjs`;
- updated `empirical-v3-source-authority-adapter-check.mjs`;
- updated `empirical-v3-safety-ui-source-guard.mjs`;
- full `empirical-v3-source-guard-check.mjs`;
- complete package/import/build/lint/test graph;
- real browser straight Run -> review -> audit -> export -> stale mutation/remount;
- real browser mixed path (still unwired intentionally);
- GitHub Actions / commit status on reviewed head.

GitHub exact-head status lookup for `5235eea7385f49af98171a4d39788eb63355c35b` returned no statuses and no workflow runs: **NOT_RUN / NOT_OBSERVED**.

## Source review evidence for takeover fixes

The fixes were grounded directly to live production source:

- `branch-process-resolver.js` preserves first row `pipingClassRowMethod` / `pipingClassRowReasons` and performs a separate rating-aware corrosion lookup;
- `piping-class-resolver.js` uses score-based row selection, so `best-score` is not synonymous with exact component identity;
- `canonical source-bound execution` already seals dataset id, source semantic hash and shared-model semantic hash into the ROM execution dependency;
- `bootstrap.js` exposes the current shared model from the active workspace;
- `engineering-model-controller.js` already identifies dataset/project/master changes as governing model-staleness events.

## Changed files in takeover slice

Exactly six production/regression paths changed between takeover base `c57dc423...` and code-reviewed head `5235eea...`:

1. `src/workspace/engineering-loads/adapters/empirical-v3-branch-process-resolution-adapter.js`
2. `src/workspace/engineering-loads/adapters/empirical-v3-resolution-reference-adapter.js`
3. `src/main.js`
4. `scripts/empirical-v3-branch-process-resolution-adapter-check.mjs`
5. `scripts/empirical-v3-source-authority-adapter-check.mjs`
6. `scripts/empirical-v3-safety-ui-source-guard.mjs`

No frozen mechanics source, tolerance, workflow YAML or V1/V2 profile changed.

## Remaining limitations / roadmap boundary

- exact-head full repository/browser CI evidence remains unavailable;
- stale live V3 packages are cleared rather than retained visibly as stale — #1152 owns the richer stale-history UX;
- mixed route execution remains non-UI and deliberately unwired until separately qualified;
- weight/contact/pressure/Bourdon/tee/reducer physics remain out of scope.

## Merge decision

Owner explicitly requested **review, fix and merge** in the current 2026-08-15 delivery turn. Code review found and corrected the release-critical custody/runtime defects above. Landing must remain stack-safe: resolve #1145 -> #1147 -> #1148 before retargeting/merging #1151 to `main`. #1150 remains untouched.
