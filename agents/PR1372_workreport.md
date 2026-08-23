# PR1372 Work Report — EMP1-30 Cylindrical Attachment Class Source Boundary

## Classification

- IMPLEMENT / NEW_PR_REQUIRED / WRITE_ALLOWED / ENGINEERING_CRITICAL
- Issue: #1370
- PR: #1372
- Starting main: `93ee0bb96919ac1fe7b92a0459a02966bdd75ba0`
- Initial branch head before this workreport: `e6bd6d30405acaa39c8454b49700bf5eea2ca60a`
- Owner merge authorization: active from chat (`merge, proceed next`), subject to exact-head/live-main verification.

## Objective

Freeze the source-authority boundary for cylindrical round-attachment classification. Prevent the existing round-only software interface from being interpreted as source proof that solid/hollow and rigid/flexible classification are irrelevant to WRC 537 applicability.

## Current engineering truth

1. Current bounded route identifies `shellFamily=CYLINDRICAL` and `attachmentShape=ROUND`.
2. Current bounded adapter does not require attachment wall thickness, solid/hollow identity, or rigidity/flexibility identity.
3. That non-use is a software-interface fact, not primary-source applicability authority.
4. `docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION`; its statement that cylindrical solid/hollow distinction is dropped is secondary/OCR research only.
5. `docs/emp1/WRC537_2013_Off_Axis_Longitudinal_Moment_Authority.md` retains a materially different off-axis condition: `1B-1/2B-1` applicability is limited to a round flexible-nozzle connection, while the actual flexible-nozzle engineering classifier remains unresolved.
6. Therefore standard eight-point attachment-class semantics and off-axis flexible-nozzle semantics must remain separate.

## Source custody

Pinned primary source:

- path: `docs/emp1/WRC537_2013.pdf`
- Git blob: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- direct page inspection in connected GitHub interface: `NOT_RUN_EXECUTION_ENVIRONMENT`

Secondary/research evidence:

- `docs/01_WRC537_METHOD_DEFINITION.md`
- classification: `SECONDARY_OCR_RESEARCH_NOT_IMPLEMENTATION_AUTHORITY`

Retained source-boundary evidence:

- `docs/emp1/WRC537_2013_Off_Axis_Longitudinal_Moment_Authority.md`
- confirms separation of standard `1B/2B` eight-point route from off-axis `1B-1/2B-1` flexible-nozzle comparison claim.

## Engineering decision

Disposition:

`BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED`

Do not claim:

- primary-qualified solid/hollow equivalence;
- primary-qualified rigidity independence;
- arbitrary round-object WRC applicability;
- a numerical flexibility threshold;
- structural lug/pad equivalence to a round nozzle;
- transfer of spherical attachment `gamma/rho` semantics to cylindrical WRC.

No existing numerical mechanics are changed by this PR.

## Changed-file ledger

1. `validation/emp1/wrc537-2013/cylindrical-attachment-class-source-qualification-v1.json`
   - machine-readable fail-closed authority ledger.
2. `docs/emp1/WRC537_2013_Cylindrical_Attachment_Class_Authority.md`
   - engineer-readable source/claim boundary.
3. `scripts/emp1-wrc537-cylindrical-attachment-class-source-check.mjs`
   - static fail-closed checker.
4. `agents/PR1372_workreport.md`
   - living handover and validation ledger.

No production evaluator, adapter, route registry, coefficient dataset, oracle, tolerance, UI, package manifest or workflow file is intentionally changed.

## Validation ledger

| Check | Status | Oracle / evidence |
|---|---|---|
| Current-main grounding before branch | PASS | GitHub branch API: `93ee0bb9...` |
| Existing EMP1-30 PR collision | PASS | GitHub PR search returned none |
| Standard/off-axis semantic separation | PASS | repository source inspection; `1B/2B` vs `1B-1/2B-1` retained documents |
| Primary WRC page re-observation | NOT_RUN | connected GitHub PDF binary unavailable for page inspection |
| Static checker execution | NOT_RUN | no local repository runtime in connected write path |
| Production numerical regression | NOT_RUN / NOT_APPLICABLE_TO_DIFF | no production numerical files changed |
| Workflow execution | NOT_RUN | no workflow change and repository infrastructure gate remains separate |

No runtime PASS is claimed from an unexecuted checker.

## Authority invariants

- Existing standard eight-point mechanics remain unchanged.
- Existing off-axis production authority remains false.
- Existing gamma/beta domains are unchanged.
- Nonzero differential pressure remains blocked.
- Non-unity Appendix-B SCF remains blocked.
- Spherical and non-round production authority remain false.
- Oblique/skewed attachment authority remains false.
- Host-shell versus nozzle/attachment stress boundary remains unchanged.
- Global EMP1.C, code-compliance and release authority remain false.

## Risks / questions / debt

- QST-1372-01: Does primary WRC 537 explicitly make solid/hollow classification irrelevant for the standard cylindrical Table-5 shell-stress route?
- QST-1372-02: Does rigidity/flexibility affect any standard eight-point curve selection, or only special off-axis claims?
- QST-1372-03: What exact physical/geometry criterion establishes `flexible nozzle`, if WRC provides one?
- QST-1372-04: Are reinforcement pads, integrally reinforced nozzles or locally thickened attachments inside the same standard family?
- DEBT-1372-01: Direct primary-page extraction is still blocked by current connector PDF-binary access.

## Appendix A — takeover qualification

### A1 Production trace — 19/20

The bounded adapter derives cylindrical geometry from `Rm`, `T`, and attachment outside radius, selects source curves, evaluates Table 5 and retains production/global authority false. Attachment class is absent from that current numerical contract. Falsifier: locate a production dependency where attachment wall thickness or rigid/flexible class changes standard Table-5 curve selection; if found, this boundary must be revised before merge.

### A2 Current failure / isolation — 19/20

The failure mode is semantic overreach, not a numerical defect: a future caller could mistake `ROUND` as sufficient applicability proof because the adapter needs no class field. This PR prevents that inference without changing existing mechanics. Falsifier: primary-qualified repository evidence proving `ROUND` alone is complete applicability identity for all standard-route attachment classes.

### A3 Authority / invariant — 20/20

Primary PDF identity is pinned by raw SHA-256, but page-level attachment-class rules are not directly observable in the connected environment. Secondary extraction cannot become engineering authority. Off-axis flexible-nozzle wording is preserved as a separate bounded claim. Any unknown class remains source-gated.

### A4 Independent validation — 18/20

This is a non-numerical source-governance increment. Independent validation consists of repository-contract falsifiers: mutate ledger flags to authorize arbitrary round objects, solid/hollow equivalence, rigidity independence, off-axis classification, or spherical-parameter transfer; the checker is designed to fail. Execution is NOT_RUN here.

### A5 Minimal patch — 19/20

The patch is four governance files only. No evaluator, dataset, registry, UI or workflow changes are mixed in. Abandon/rework condition: live main introduces overlapping attachment-class authority or direct primary evidence that contradicts the retained fail-closed conclusion.

**Score: 95/100; every item >=18/20.**

## Next action

Immediately before merge:

1. re-fetch live `main`;
2. compare any drift against EMP.1/WRC/attachment-class paths and authority semantics;
3. verify PR changed filenames are exactly the four ledgered files;
4. verify PR is mergeable and exact head is unchanged;
5. merge only with `expected_head_sha`;
6. record merge result on issue #1370;
7. proceed to the next independent WRC applicability seam.
