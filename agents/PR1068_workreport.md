# PR 1068 Work Report — Append-Only Governed Run Publication Evidence

## Mission Control

| Field | Current truth |
|---|---|
| Parent roadmap | #1024 — LFEA Standalone Application |
| PR | #1068 — `LFEA standalone: append-only governed run publication evidence` |
| Branch | `agent/lfea-native-run-evidence-ledger-1024` |
| Base | `main@24f70bcaf9b717cecf34818780165caca60bb178` — merged #1065 B31 boundary |
| Status | DRAFT |
| Engineering state | Static audit complete; no known unresolved production-code blocker |
| Executable qualification | NOT_RUN — workflows remain intentionally retired by #1043 and this host has no repository execution environment |
| Merge authority | Not requested in this report |

## Handover in 60 Seconds

Before this slice, an LFEA run was archived immediately after raw B-3.3 execution and B-3.4 recovery. Governed support actions and B31 code applications are created later. History could therefore retain the solve/recovery but not the exact later engineering publications needed by a future calculation dossier or issue package.

PR #1068 adds a companion append-only evidence ledger. It does **not** modify the immutable run record. A support or B31 publication can be attached only when it is CURRENT/reviewed, its existing review authorization revalidates, and its retained raw-execution and recovery-batch parent hashes match the exact archived run.

```text
immutable archived run
  -> CURRENT governed publication
  -> revalidated reviewed authorization
  -> exact raw/recovery parent match
  -> append-only evidence attachment
  -> History/read API
  -> future explicit issue-package selection boundary
```

No engineering quantity is recalculated in this layer.

## Why This Slice Comes Before Issue / Export

A defensible issued calculation cannot reconstruct later support/B31 engineering evidence from ambient current UI state. It must identify the exact evidence that belonged to the run being issued.

The run ledger therefore needs to retain, independently:

- raw execution identity;
- B-3.4 recovery identity;
- support authority/review/publication identity where published;
- B31 authority/review/code-recovery/application identity where published.

Only after those histories are retained can an issue/export authority explicitly choose the evidence set it is authorizing.

## Authority and Immutability Model

### Run record

`lfea-native-run-record/v1` remains unchanged. Its `semanticHash` and deterministic `runId` continue to depend only on the original archived run identity.

### Evidence attachment

`lfea-native-run-evidence-attachment/v1` binds:

- run ID;
- run semantic hash;
- evidence kind (`SUPPORT_ACTIONS` or `B31_CODE`);
- parent raw-execution semantic hash;
- parent recovery-batch semantic hash;
- compact identity summary;
- complete retained governed publication evidence;
- attachment semantic hash.

Adding evidence therefore does not rewrite or reseal the run itself.

## Evidence Retained

### Support actions

The attachment retains:

- reviewed support authority;
- revalidated support authorization/reviewer identity;
- exact per-case support publications and interface-recovery evidence.

### B31

The attachment retains:

- reviewed B31 authority;
- revalidated B31 authorization/reviewer identity;
- code-recovery identities;
- complete sealed B31 application and code-result evidence.

The ledger calls the existing `requireLfeaNativeSupportAuthorization()` and `requireLfeaNativeB31Authorization()` contracts before accepting publication evidence. A caller cannot convert a `CURRENT` flag plus an invented reviewer/hash into reviewed historical evidence.

## Fail-Closed Gates

1. Run schema is required.
2. Run semantic hash is recomputed from retained run identity.
3. Deterministic run ID is recomputed and must match.
4. Publication must be `CURRENT` and carry authority, authorization and publication-parent records.
5. Existing support/B31 authorization contract must revalidate exact shape, parent identities, reviewer/reason and semantic hash.
6. Publication parent raw-execution hash must equal the archived run raw hash.
7. Publication parent recovery-batch hash must equal the archived run recovery hash.
8. Support/B31 authority identity must agree with the retained publication parent.
9. Support publication cases / B31 application and code recoveries must actually be retained.
10. Stale publication cannot create a new attachment.
11. Runtime publication refuses to proceed when no exact CURRENT archived run exists.

## Append-Only Semantics

Identical semantic attachment content deduplicates idempotently.

A later distinct reviewed publication for the same run is **not** allowed to overwrite an earlier attachment. It becomes another attachment. This is intentional evidence custody.

This PR does not define a hidden `latest wins` rule. A future issue/export authority must explicitly identify which attachment semantic hash(es) are part of the issue package.

## History Behavior

History snapshot entries now include `evidenceAttachments` beside the immutable run record.

The History UI displays:

- attachment kind;
- attachment semantic hash;
- reviewed authorization semantic hash.

The existing invariant remains explicit in the UI: selecting a historic run **changes this view only** and does not change current engineering authority.

Later source/model/current-run movement changes the run relation (`CURRENT/HISTORIC/STALE`) but does not erase retained publication attachments.

## Public API

Read-only additions:

- `getNativeRunEvidence(runId)`
- `getNativeRunEvidenceLedger()`

There is no public API that fabricates or directly appends evidence. Attachment remains inside governed runtime publication flow.

## Changed-File Ledger

### Production

- `src/lfea/native-run-evidence-ledger.js` — new append-only evidence authority
- `src/lfea/native-run-history.js` — companion ledger integration and snapshot projection
- `src/lfea/native-history-view.js` — read-only attachment display
- `src/lfea/standalone-runtime.js` — exact-current-run attachment after governed publication
- `src/lfea/standalone-runtime-api.js` — read-only evidence queries

### Qualification

- `scripts/lfea-standalone-native-run-evidence-check.mjs`
- `scripts/run-lfea-standalone-check.mjs`

## Focused Qualification Contract

The committed focused script is intended to prove:

1. empty ledger fabricates nothing;
2. forged run identity is rejected;
3. a tampered reviewed authorization is rejected;
4. support publication attaches to exact run without run mutation;
5. identical attachment is idempotent;
6. wrong raw/recovery parent is rejected;
7. B31 and support evidence can coexist on one run;
8. unrelated later current context does not erase historic evidence;
9. stale publication cannot append evidence;
10. a real governed InputXML execution/recovery is archived through `createLfeaNativeRunHistory()`, publication evidence is attached, and History projects it beside the unchanged CURRENT run record;
11. source guards prohibit solver/recovery/support/B31 calculation in the ledger;
12. runtime/history/API ownership is present;
13. established physical-line budgets remain satisfied.

## Static Review Findings and Repairs

| ID | Finding | Resolution |
|---|---|---|
| RUN-EVID-01 | Run History previously retained only raw/recovery evidence while support/B31 were published later. | Added companion append-only run evidence ledger. |
| RUN-EVID-02 | Rewriting the run record to add publications would change run identity. | Run record is untouched; attachments carry independent hashes. |
| RUN-EVID-03 | A publication could otherwise be attached to a different run. | Exact raw-execution and recovery-batch parent hashes are mandatory. |
| RUN-EVID-04 | A caller could present an object claiming a run ID. | Recompute run semantic hash and deterministic run ID before attachment. |
| RUN-EVID-05 | Historic selection could be confused with current authority. | Existing view-only selection contract remains unchanged and source-guarded. |
| RUN-EVID-06 | Later staleness could tempt cleanup/removal of old publication evidence. | Evidence ledger has no reconcile/delete-on-stale behavior; attachments remain until History itself is cleared/destroyed. |
| RUN-EVID-07 | Duplicate publication calls could duplicate identical evidence. | Exact semantic attachment deduplicates idempotently. |
| RUN-EVID-08 | Multiple different reviewed publications for one run need deterministic custody. | Preserve all as distinct append-only attachments; future issue/export must explicitly select attachment hashes. |
| RUN-EVID-09 | History UI could accidentally rederive publication values. | UI shows identity/reviewer hashes only; source guard rejects engineering producer calls in ledger. |
| RUN-EVID-10 | Existing History qualification requires explicit view-only language. | Preserved `changes this view only` wording. |
| RUN-EVID-11 | A `CURRENT` state with a fabricated authorization could otherwise satisfy only hash-link checks. | Revalidate existing support/B31 authorization contracts before evidence retention. |
| RUN-EVID-12 | Initial focused qualification proved the ledger store but only source-guarded its History consumer. | Added real governed InputXML execution/recovery + native History archive/attachment/projection behavior. |

## Architecture / Numerical Boundaries

This PR does **not** call or change:

- stiffness assembly;
- solver execution algorithms;
- B-3.4 recovery algorithms;
- `recoverComponentCodePoint()`;
- support interface/load recovery;
- support triad projection;
- B31 application or code-result calculation;
- comparison arithmetic;
- dossier calculation;
- source/model authority.

The evidence layer retains producer output; it does not become a second producer.

## Deliberate Non-Goals

- engineering issue/release approval;
- PDF/report/export generation;
- persistent project/run storage;
- hidden selection of one attachment when multiple exist;
- new B31 categories;
- fitting/B31J mechanics;
- changes to support-action calculations;
- changes to raw/recovered numerical results.

## Evidence Limitation

### Exact-head executable qualification: NOT_RUN

PR #1043 intentionally retired GitHub Actions workflow definitions and required CI contexts. The current host does not provide a local repository execution environment for the committed Node/Vite qualification suite.

Therefore this report does **not** claim executable PASS for the final PR head. The focused qualification and aggregate hook are committed as executable evidence for the next available qualified environment.

No CI workflow is restored or weakened merely to manufacture a green status.

## Merge Gate

Keep #1068 **DRAFT** unless one of the following occurs:

1. executable qualification becomes available and the committed focused/standalone checks pass on one synchronized exact head; or
2. the user explicitly accepts the documented post-#1043 `NOT_RUN` limitation for this exact run-evidence slice after static review.

Only after this evidence-retention boundary is accepted should #1024 proceed to an explicit issue/export authority that selects exact run + attachment evidence and remains fail-closed on stale/unqualified state.
