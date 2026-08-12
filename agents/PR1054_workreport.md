# PR 1054 Work Report — Certified Support Movement Semantics

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1054 — `design(3d-edit): certify support movement semantics` |
| Branch | `agent/certified-support-movement-semantics` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap | `4140ffbd147b9cc73655d00e8264f8fb774869ff` — empty tree-equivalent commit |
| Mission | Define exact, governed support movement/edit semantics without weakening the existing support/geometry fail-closed boundary. |
| Status | DRAFT / report-first architecture audit |
| Production changes | NONE AUTHORIZED until support identity, host, station, direction and command/journal semantics are pinned below |
| Pending sibling qualifications | #1051 TEE/reducer and #1053 NODE_POSITION remain draft/unmerged with exact-head empirical execution `NOT_RUN`; this PR must not depend on their unmerged production changes. |

## Preserved Authority

Any eventual support operation must remain:

`exact support identity -> exact host relationship -> explicit support policy -> governed intent/command -> operation plan -> Preview -> validation -> certified transaction -> canonical topology -> existing journal Undo/Redo`

The following are prohibited unless separately justified and recorded before implementation:

- direct support/canonical writes from Table, DOM, Canvas or fixture helpers;
- renderer-owned support geometry as engineering authority;
- implicit support following inferred only from proximity;
- silent restationing after host-edge geometry changes;
- guessed global/fixed/support-local movement policy;
- mutation during input, Stage, Preview or Validate;
- a second support-specific history/undo stack;
- weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED` to make parent geometry edits pass;
- depending on unmerged #1051/#1053 source.

## Current Known Boundary

Merged #1036 deliberately made parent geometry changes fail closed when affected support-host geometry has no certified movement policy. That remains the baseline safety contract. This slice begins by deciding whether support editing should be represented as one or more explicit operations such as:

1. **RELOCATE_SUPPORT_ABSOLUTE** — support moves to an explicit new world/canonical position while host relationship is preserved or explicitly rebound;
2. **RESTATION_SUPPORT_ON_HOST** — support keeps a selected host edge and receives an explicit station along that host;
3. **FOLLOW_HOST_TRANSLATION** — support moves only as an explicit participant in a parent geometry transaction, with deterministic translation evidence;
4. **SUPPORT_PROPERTY_EDIT** — support type/direction/gap/travel edits, kept separate from geometric relocation unless command authority already proves safe composition.

These are candidates only, not authorization.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1054-01 | Safety | ACCEPTED | Existing support-dependent parent geometry blocking remains final until a certified support movement policy exists. |
| DEC-1054-02 | Scope | ACCEPTED | Audit/contract first; no support mutation source before exact canonical representation and journal command coverage are known. |
| DEC-1054-03 | Integration | ACCEPTED | PR must build from current `main` only; #1051/#1053 remain independent drafts. |
| RISK-1054-01 | Host semantics | OPEN | Support records may identify hosts by edge/component/node fallback; exact editable host authority must be inspected. |
| RISK-1054-02 | Station semantics | OPEN | Need to determine whether station is canonical, source-observed, derived, or cached presentation data before allowing edits. |
| RISK-1054-03 | Direction/frame | OPEN | Support direction may be world, pipe-local or source-specific; no frame conversion may be guessed. |
| RISK-1054-04 | Command authority | OPEN | Need to identify whether existing commands can update support records atomically or whether a new governed command is required. |
| RISK-1054-05 | Qualification | OPEN | Repository workflows remain retired; authored tests must not be represented as executed evidence without a runner. |

## Stage Roadmap

### S0 — Report-first custody — COMPLETE

PR opened from current main with empty bootstrap. This numbered report is the first changed file.

### S1 — Canonical/support authority audit — IN PROGRESS

Inspect:

- canonical support record shape and crosswalk/source custody;
- support host-edge resolution and dependency evidence;
- projection/Table support fields and capability states;
- existing command/journal support mutations, if any;
- renderer support placement inputs versus canonical/source authority;
- source fixture support fields for representative REST/GUIDE cases;
- tests covering support host resolution, changed scope, stale revisions and undo/redo.

No production source modification during S1.

### S2 — Semantic decision — PENDING

Record the minimal certified operation(s), exact inputs, fail-closed cases, changed scope and transaction composition. If existing commands cannot represent the required semantics exactly, stop and register the command gap before implementation.

### S3 — Pure contract implementation — PENDING

Only after S2: add pure capability/planner/command contracts with deterministic immutable evidence and no UI coupling.

### S4 — UI/browser qualification source — PENDING

Only after S3: expose explicit support editing controls through governed intents, preserving non-mutation before Apply and exact journal Undo/Redo.

### S5 — execution/merge custody — PENDING

Empirical execution remains separate from authored test source. Do not merge unexecuted behavior merely because branch protection is off.

## Authorized Changed-File Ledger

Current authorized scope:

- `agents/PR1054_workreport.md`

No production or test path is authorized until S1 audit records the exact need here first.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | merged support dependency closure + valve catalogue base |
| `4140ffbd147b9cc73655d00e8264f8fb774869ff` | empty bootstrap, zero changed files |
| report-first head | report only; no behavior change |

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| support relocation semantics | NOT_RUN | authority audit in progress |
| support property editing | NOT_RUN | authority audit in progress |
| parent-geometry support follow | NOT_AUTHORIZED | merged fail-closed policy remains in force |
| browser execution | NOT_RUN | no current runner/workflow evidence |

## Next

1. Audit canonical support representation and host/station/frame authority.
2. Audit existing support mutation commands/journal capability.
3. Decide the smallest exact operation set; stop on any ambiguous semantics.
4. Register exact implementation/test files before modification.
