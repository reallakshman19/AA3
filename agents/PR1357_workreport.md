# PR1357 work report — EMP1-24 gamma5 beta lower-domain authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1356`
- `PR: #1357`
- `BASE: main@c0ebe83323ab735297a67a147e14809c16213a73`
- `BRANCH: agent/emp1-24-gamma5-beta-lower-domain-source`
- `MERGE_AUTHORITY: OWNER_GRANTED_IN_CHAT_2026-08-23`
- `PRODUCTION_CODE_CHANGED: false`
- `WORKFLOW_FILES_CHANGED: false`
- `BETA_BELOW_0P05_AUTHORIZED: false`
- `BETA_ABOVE_0P5_AUTHORIZED: false`
- `GAMMA5_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORITY: false`
- `RELEASE_QUALIFIED: false`

## Objective

Determine whether the existing exact-tabulated gamma=5 Original-curve domain may be widened below beta=0.05 from currently retained source authority, while preserving the source-qualified beta=0.5 upper limit and the eight-point 1B/2B longitudinal selection.

## Re-grounding and drift

Initial issue #1356 was opened from `main@cc957b1cbc8dec8b6cbe76847b5f3cdd07d537e4`.

Before PR #1357 opened, main advanced to `c0ebe83323ab735297a67a147e14809c16213a73` through a LAFEA.6 presentation-only merge. Mandatory comparison showed only:

- `agents/PR1353_workreport.md`;
- `e2e/lafea6-mesh-not-applicable.spec.js`;
- `scripts/lafea6-unsupported-execution-presentation-check.mjs`;
- `src/workspace/lafea-solve-readiness-panel.js`;
- `src/workspace/lafea-workbench-content.js`.

There is no EMP.1/WRC/beta/domain overlap. The PR branch was therefore rebuilt from exact current main before finalization.

## Source/domain findings

Pinned WRC source SHA-256:

`698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

Current bounded-domain ledger states:

```text
gamma = 5 exactly
variant = ORIGINAL
beta minimum = 0.05 inclusive
beta minimum classification = conservative product boundary, not claimed as general WRC lower limit
beta maximum = 0.5 inclusive
beta maximum classification = primary gamma5 chart limit
```

The current eight-point route uses 14 unique Original figures:

```text
1A 2A 3A 4A
1B 2B 3B 4B
1C 1C-1 2C 2C-1 3C 4C
```

`1B-1/2B-1` are not in this route intersection; EMP1-23 retains them as off-axis comparison-only curves.

## Engineering disposition

The retained source evidence proves the complete gamma5 route covers the present product band `0.05 <= beta <= 0.5`.

It does not retain, for every required route figure, an exact primary-source numeric lower endpoint plus endpoint inclusivity below 0.05. Direct primary-page reobservation is unavailable in the current connected environment. Therefore the route cannot be widened safely.

The following are explicitly rejected as substitutes:

- rational-fit numerical behavior below 0.05;
- coefficient-row existence;
- graphical endpoint estimation/digitization without separate authority;
- assumed common lower endpoint across figures;
- Extrapolated-family fallback.

Current disposition:

`BLOCKED_BETA_BELOW_0P05_PRIMARY_LOWER_ENDPOINT_UNQUALIFIED`

## Changed-file ledger

1. `validation/emp1/wrc537-2013/gamma5-beta-lower-domain-source-qualification-v1.json`
2. `docs/emp1/WRC537_2013_Gamma5_Beta_Lower_Domain_Authority.md`
3. `scripts/emp1-wrc537-gamma5-beta-lower-domain-source-check.mjs`
4. `agents/PR1357_workreport.md`

No production evaluator, route registry, coefficient dataset, oracle, tolerance, UI, package or workflow file is changed.

## Validation ledger

### VAL-BETA-01 — exact current-main grounding
- status: `PASS`
- basis: `REMOTE_REPOSITORY_INSPECTION`
- base: `c0ebe83323ab735297a67a147e14809c16213a73`

### VAL-BETA-02 — intervening main drift
- status: `PASS_NO_EMP1_OVERLAP`
- basis: commit comparison from `cc957b1c...` to `c0ebe833...`
- movement is LAFEA.6 presentation-only.

### VAL-BETA-03 — current beta classifications
- status: `PASS_SOURCE_INSPECTION`
- lower 0.05 remains conservative product boundary;
- upper 0.5 remains primary gamma5 chart limit.

### VAL-BETA-04 — current route figure-set reconciliation
- status: `PASS_SOURCE_INSPECTION`
- 14 unique figures identified;
- eight-point longitudinal selection uses 1B/2B;
- off-axis 1B-1/2B-1 excluded.

### VAL-BETA-05 — complete lower-endpoint source custody
- status: `NOT_RUN_PRIMARY_PAGE_ACCESS / BLOCKED`
- exact numeric lower endpoints and inclusivity are not retained for all 14 route figures.

### VAL-BETA-06 — focused Node checker
- status: `NOT_RUN_EXECUTION_ENVIRONMENT`
- no runtime PASS claimed.

## Protected invariants

- beta remains `0.05 <= beta <= 0.5`;
- no beta<0.05 production comparison/route authority;
- no beta>0.5 widening;
- gamma remains exactly 5;
- Original variant only;
- no extrapolated fallback;
- eight-point longitudinal selection remains 1B/2B;
- no pressure/SCF/off-axis/global/code/release widening;
- no workflow change.

## Next gate

Obtain direct source-qualified numeric lower endpoints and inclusivity for all 14 required Original figures. Compute the strict route-domain intersection only from that source evidence. If any endpoint remains graphical/ambiguous, keep beta<0.05 blocked unless a separate digitization method is explicitly authorized and qualified.

## Appendix A — takeover questions

1. Why is beta=0.05 not described as the general WRC lower limit?
2. Why is beta=0.5 materially different in authority classification?
3. What are the exact 14 Original figures used by the current eight-point route?
4. Why are 1B-1/2B-1 excluded from this route-domain intersection?
5. What is the source rule in §4.4 regarding Original curve limits?
6. Why does a finite rational-fit value below 0.05 not authorize use there?
7. Why is coefficient-row existence not curve-domain authority?
8. What endpoint information must be retained for each figure before widening?
9. Why must endpoint inclusivity be known?
10. Is graphical digitization authorized by this PR?
11. Can Extrapolated curves fill a missing Original interval?
12. Does this PR alter the current gamma5 route or registry?
13. Does this PR alter beta>0.5 authority?
14. What exact evidence closes this source gate?

Target takeover score: >=92/100 total and every question >=17/20 before production semantic widening.
