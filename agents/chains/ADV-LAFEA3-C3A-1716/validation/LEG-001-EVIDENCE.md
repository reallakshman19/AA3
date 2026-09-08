# LEG-001 evidence — C3-A route custody and #1663 reconciliation

CHAIN_ID: ADV-LAFEA3-C3A-1716
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1716
MATERIAL_LEG: LEG-001
BASE_MAIN: 27dde65f51e1b9d7e6d20a324510a50ea3631729
PREWORK_BRANCH_HEAD: 4841a75f65b02cfed9531f294660dc27a7dce184
MATERIAL_HEAD: ec26f2169faecc315721de37a8b791f632249c1c
DEPENDENCY_PR: #1663
DEPENDENCY_HEAD: 87851d7a2132842d60efc8e46a543c9ae16303da
DEPENDENCY_MERGE_BASE: 80f335b750a13a06741a787106949bada1ad7f37
CURRENT_EXECUTED_BM_MESH_CODE_BASIS: 798b2580fa0a42ac72342addcc8d6b5e99aec0a6
MERGED_BM_MESH_PR: #1715

## First wrong / incomplete boundary

Production physical-probe evidence already retains `custody.canonicalExecutionInputHash`, but `src/workspace/lafea-continuum-convergence-workbench.js::levelReceipt()` and `src/workspace/lafea-continuum-convergence-study.js::normalizeLevelReceipts()` did not propagate it. Consequently the BM005 ordinary-route audit could not retain the complete per-level execution identity chain required by issue #1716 even though the authoritative upstream owner already supplied the value.

Classification: EVIDENCE_CUSTODY_DEFECT. This is not a solver, formulation, quadrature, mesher, quality-policy, oracle or tolerance defect.

## Minimal repair

Material commit `ec26f2169faecc315721de37a8b791f632249c1c`:

- `lafea-continuum-convergence-workbench.js`: copy `probeEvidence.custody.canonicalExecutionInputHash` into each level receipt and completed-level failure custody; retain existing mesh/solver/execution/recovery/probe identities.
- `lafea-continuum-convergence-study.js`: fail closed unless each level carries a canonical SHA-256 execution-input hash and retain it in normalized study evidence.
- `lafea.3-continuum-convergence-route-check.mjs`: synthetic evidence now carries a distinct canonical execution-input hash and asserts preservation through the study normalizer.
- `lafea.3-bm005-ordinary-route-check.mjs`: require the retained canonical input hash for each level and include the level/hash list in BM005 qualification evidence.

Diff review from `4841a75f...` to `ec26f216...`: exactly four files, 32 additions, 0 deletions. No protected numerical or authority path changed.

## #1663 material reconciliation

#1663 introduces 12 non-relay material files from merge base `80f335b...`. Current main is 632 commits ahead of that merge base while #1663 is 92 commits on its divergent side. Classification below uses exact Git blob identity, not branch age alone.

| Path | #1663 blob | current-main blob | Classification | Disposition |
|---|---|---|---|---|
| `scripts/lafea-mesh-benchmark-run.mjs` | `075f97ee9bc56415010e88ab8c61334e75da52cb` | `7a8c8e9bfd432070d55e5c2ac42bbc1d5ea7c97a` | CONFLICTING_STALE / SUPERSEDED | Do not port; #1715 repaired execution/evidence wiring and retained passing M0-M4 evidence. |
| `scripts/lib/lafea-mesh-benchmark-m4.mjs` | `6eb34aca95bf8e762b2c7940d24bc55994020650` | `69e286739a620ff8b5522d8225752c2780735f46` | CONFLICTING_STALE / SUPERSEDED | Do not port; current #1715 M4 route is the executed line. |
| `validation/lafea-benchmark-data/MESH/bucket-manifest.json` | `63d3522429ab65462e2c314ecff16a434708dae7` | `2eac1b62f2721f477b74c82e101a5911da1a24b6` | CONFLICTING_STALE / SUPERSEDED | Keep current source/manifest custody. |
| `validation/lafea-benchmark-data/MESH/convergence/fixed-probes.json` | `32436222284374cd94bad09ba4980ce64a0d28e8` | same | ALREADY_IMPORTED_IDENTICAL | No action. |
| `validation/lafea-benchmark-data/MESH/convergence/m4-physics-response.json` | `7fcf6bea3c31a16973b953568bc9732401422a1b` | same | ALREADY_IMPORTED_IDENTICAL | No action. |
| `validation/lafea-benchmark-data/MESH/convergence/mesh-ladders.json` | `7be1e34b9e35c35f27be4aae49dfc441090fad4b` | same | ALREADY_IMPORTED_IDENTICAL | No action. |
| `validation/lafea-benchmark-data/MESH/convergence/shell-thickness.json` | `b0e408cee23df76d247a9dc7a7ac2bc49c144094` | same | ALREADY_IMPORTED_IDENTICAL | No action. |
| `validation/lafea-benchmark-data/MESH/geometry/cases.json` | `0706fca501e6c209e262f40c2ab2c2e7ad750d4e` | same | ALREADY_IMPORTED_IDENTICAL | No action. |
| `validation/lafea-benchmark-data/MESH/governance/negative-cases.json` | `2e587ed1e45fd9b1a4fa67ed7d50535f49541193` | same | ALREADY_IMPORTED_IDENTICAL | No action. |
| `validation/lafea-benchmark-data/MESH/oracle/expected-values.json` | `05db5ea19f2ce71ce20f2548abb96c34775a9883` | same | ALREADY_IMPORTED_IDENTICAL | No action. |
| `validation/lafea-benchmark-data/MESH/sources/source-registry.json` | `16b87dc301bc545fa74ab36c5c70e0ff55aff4c3` | `338debf9bbd75bc6032298e140543e82eee9d4a6` | CONFLICTING_STALE / SUPERSEDED | Keep current explicit source pins/custody. |
| `validation/lafea-benchmark-program/program.json` | `22e9eafd78d824b628391e602143d8a7d45c9321` | `c3d5cfc337f8d1c9f559d7c621b022cc80da9f11` | CONFLICTING_STALE / SUPERSEDED | Do not overwrite newer program registry state. |

Result: 7/12 material blobs are already imported byte-identically; 5/12 are divergent and superseded by the merged/executed #1715 line. `STILL_NEEDED_DISJOINT = 0`. #1663 must not be merged or cherry-picked wholesale.

## Validation truth

PASS by connected-source/diff inspection:
- exact material diff is one commit and four scoped files;
- 32 additions / 0 deletions;
- upstream canonical hash owner is the production physical-probe evidence; no duplicate hash calculation introduced;
- no solver/formulation/quadrature/mesher/oracle/tolerance/B02/workflow/release path changed;
- #1663 material reconciliation is complete by exact blob identity.

NOT_RUN:
- `node scripts/lafea.3-continuum-convergence-route-check.mjs`;
- `node scripts/lafea.3-bm005-ordinary-route-check.mjs`;
- `npm run check:lafea-meshing`;
- `npm run check:imports`;
- `npm run build`;
- `git diff --check` in a faithful checkout.

Reason: this session has connected GitHub repository APIs but no faithful mounted project checkout/Node execution environment. GitHub commit status for material head `ec26f216...` reports zero statuses. No NOT_RUN item is promoted to PASS.

## Protected unchanged domains

Element mechanics, stiffness/load assembly, T3/T6/Q8 integration, mesh generation mathematics, mesh quality thresholds, convergence policy/tolerances, independent BM005/Richards oracle, B02 source authority, workflows, release and roadmap authority are unchanged.

## Next boundary

Current-main BM005 numerical execution remains required. On a faithful clean checkout, first run:

`node scripts/lafea.3-continuum-convergence-route-check.mjs`

then:

`node scripts/lafea.3-bm005-ordinary-route-check.mjs`

Retain exact stdout/stderr/exit, clean-tree state and resulting report identities. A failure must be isolated at the first wrong owner; no additional numerical patch is authorized by this LEG-001 evidence.
