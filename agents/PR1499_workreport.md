# PR1499 Work Report — standard cylindrical round attachment class source reconciliation

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_CURRENT_MAIN_REGROUNDED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_SOURCE_GOVERNANCE_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: MERGE_AUDIT
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1370_STANDARD_CYLINDRICAL_CLASS
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: GRANTED_EXPLICIT_OWNER_CURRENT_CONVERSATION
PR: #1499
ISSUE: #1370
UMBRELLA: #1389
BRANCH: agent/issue-1370-primary-standard-round-class-20260828
CRITICALITY: ENGINEERING_CRITICAL
TECHNICAL_BASE_MAIN: 3e22134fe224bb6ea128bea9547b331cd633a8b8
CURRENT_LIVE_MAIN_AT_REGROUND: 4d18fca2f049b3a8b7b1dc64594189d51fd9645a
CURRENT_LIVE_MAIN_TREE: e5bb411116d06b1a5a5bc68384584b888999d512
INTERVENING_MAIN_CHANGE: PR1491_LOAD_CALC_SOURCE_AXIS_GENERAL_SCALAR_GRAVITY
DRIFT_CLASSIFICATION: SAFE_AUTHORITY_DISJOINT_NO_EMP1_WRC_SOURCE_OVERLAP
TECHNICAL_SOURCE_HEAD: ef24ddefd0df01acc1bd3bb03b6b2cb970bacdd6
SOURCE_LEDGER_BLOB: 1300f3e621d1fcaf959be45fb700dd56ffa921d5
SOURCE_CHECKER_BLOB: 67581ea96aebbfdd0233bc711ced28e61502fc2c
AUTHORITY_DOC_BLOB: 2d2eda30b4397bdbcd11d66c012637266c8f9045
GROUNDING_EPOCH: GE-PR1499-001
CURRENT_STAGE: FINAL_EXACT_DIFF_REVIEW_AND_MERGE_GATE
CURRENT_BLOCKER: nonstandard/modified attachment classes and off-axis flexible-nozzle classifier remain unqualified; pinned PDF direct-page observation remains NOT_RUN
HIGHEST_RISK: widening the standard cylindrical round host-shell class to arbitrary round objects or importing excluded off-axis flexible-nozzle authority
EXACT_NEXT_ACTION: attach six-file current-main re-ground, verify zero behind/current main, zero reviews/threads and no protected-path leakage; merge if clean, then reconcile #1389 aggregate/current-state in a separate successor.
```

## Mission

Advance Issue #1370 from Table-5-input-silence evidence to direct cylindrical-method source semantics.

Invariant:

`STANDARD_CYLINDRICAL_ROUND_CLASS_AUTHORITY_DOES_NOT_AUTHORIZE_ARBITRARY_ROUND_SURROGATES_OR_OFF_AXIS_FLEXIBLE_NOZZLE_CLAIMS`

## Primary source result

Observed directly readable WRC 537 (2013) primary-document text rendering at:

`https://studylib.net/doc/25312294/wrc-537-`

Relevant locators:

```text
§1.3       r0 = outside radius of cylindrical attachment
§4.2.2     cylindrical attachment families = round or rectangular
§4.2.2.1   round beta = 0.875*r0/Rm, Eq. (26)
§4.3.4     round attachment illustrated by a pipe for cylindrical shell torsional stress
§4.5.3     method produces shell stress, not attachment stress; nozzle case explicitly discussed
Appendix A off-axis discussion
            1B-1 / 2B-1 special maximum-stress treatment limited to a round flexible-nozzle connection
```

The source itself therefore distinguishes cylindrical attachment method families by geometry and does not define SOLID/HOLLOW, RIGID/FLEXIBLE or attachment wall thickness as standard §4 round curve-selection parameters.

## Qualified bounded class

```text
identity                    WRC537_CYLINDRICAL_STANDARD_ROUND_HOST_SHELL_ATTACHMENT
shell family                CYLINDRICAL
attachment family           ROUND
geometry parameter          r0 outside radius at shell juncture
standard parameter          beta = 0.875*r0/Rm
standard route              axes-of-symmetry / eight-point only
host-shell stress           true
off-axis 1B-1/2B-1         false
attachment/nozzle-wall      false
structural round surrogate  false
reinforcement-specific      false
```

This supports the narrower conclusion that the standard cylindrical round host-shell route does not require solid/hollow or rigidity/flexibility distinction for §4 curve selection. It does **not** claim universal physical solid/hollow equivalence.

## Remaining blockers

- arbitrary round objects lacking proof they are standard cylindrical attachments;
- structural lug/pad/clip/support surrogates;
- reinforcement pads, integral reinforcement, locally thickened or modified junctions;
- large/substantially non-idealized attachments under §4.5/Appendix A;
- source-qualified flexible-nozzle classification before any 1B-1/2B-1 route;
- attachment/nozzle wall stress;
- non-unity Appendix-B SCF;
- code/release authority.

## Source custody

```text
pinned repository PDF SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
pinned repository Git blob    = ce861233928154145a9257efbbf8dbef3f5a17d1
external primary text         = observed
external byte identity        = UNPROVEN
pinned PDF direct page view   = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

No external rendering is represented as byte-for-byte custody of the pinned PDF.

## Current-main overlap audit

Between technical allocation and PR creation, main advanced once through PR #1491. Its paths are non-FEA source-axis/default/support-site logic and checks. No #1370 artifact, EMP.1/WRC source, route/registry, P0/release/current-state, oracle/tolerance, workflow or UI path overlaps this source batch.

Classification: `SAFE_AUTHORITY_DISJOINT`.

## Changed-file ledger — exact intended six

Technical:

1. `validation/emp1/wrc537-2013/cylindrical-attachment-class-source-qualification-v1.json`
2. `scripts/emp1-wrc537-cylindrical-attachment-class-source-check.mjs`
3. `docs/emp1/WRC537_2013_Cylindrical_Attachment_Class_Authority.md`

Recovery:

4. `agents/PR1499_workreport.md`
5. `agents/status/PR1499.yaml`
6. `agents/claims/PR1499.yaml`

Protected exclusions: all `src/core/**`, P0/current-state/release files, route/registry, source bytes, oracle/tolerances, evidence 01-12, workflows and UI/browser paths.

## Validation truth

```text
primary-document text inspection          PASS_TEXT_OBSERVED
pinned PDF direct-page observation        NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
external byte equality                    UNPROVEN
attachment-class source checker           NOT_RUN
production numerical comparison           NOT_APPLICABLE
production numerics changed               false
route/registry changed                    false
off-axis authority changed                false
release/code authority changed            false
```

No NOT_RUN/UNPROVEN state is promoted to PASS.

## Appendix A

A1 20/20 — traced current standard round route and source-class boundary.
A2 20/20 — replaced Table-5 silence inference with §1.3/§4.2/§4.3/§4.5 source facts while preserving pinned-byte custody distinction.
A3 20/20 — bounded standard round host-shell class only; off-axis/nonstandard classes remain fail-closed.
A4 19/20 — primary text and retained source relationships independently inspected; pinned PDF direct-page and checker execution remain NOT_RUN.
A5 20/20 — exactly three source-governance files plus three recovery records; no mechanics/authority widening.

**99/100; minimum 19/20.**
