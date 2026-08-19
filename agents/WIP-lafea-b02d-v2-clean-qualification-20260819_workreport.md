# WIP — LAFEA B02D V2 clean qualification successor

HANDOVER_READINESS: IN_PROGRESS
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
BASE_BRANCH: agent/lafea-b01-nullspace-qualification-20260819
BASE_HEAD_AT_START: 0140ef36032b1e86aee83ace134b44206840546d
SOURCE_RECOVERY_PR: #1254
PREREQUISITE_PR: #1258
MERGE_AUTHORITY: NOT_GRANTED

## Mission
Recover only the prospectively frozen B02D V2 mesh definition, generator and pre-observation qualification from experimental PR #1254, then qualify V2 through a dedicated opt-in production-response route on top of the B01 nullspace candidate. Preserve registered V1 production binding and all release/trust authority until V2 qualification is complete.

## Source-qualified V2 facts
- definition frozen before production response observation;
- response output not used to choose V2;
- H ladder = 40, 20, 10, 5 mm;
- annulus = Ri 20 mm, Ro 100 mm;
- refinement ratio = 2;
- radial anchors = 27, 33, 47, 73, 87 mm; protected breakpoint 60 mm;
- circumferential anchors = 17, 67, 83 deg; protected breakpoints 90/180/270 deg;
- angular background base divisions = 20;
- angular anchor-window clearance fraction = 0.32;
- all T3/T6/Q8 x L1-L4 pre-observation meshes deterministic and non-blocking under unchanged hard quality thresholds;
- old first V2 production response reached T6/L4 and failed reaction equilibrium; this is the exact failure class addressed by prerequisite PR #1258.

## Protected invariants
- V1 generator/definition remain unchanged and registered;
- V2 is opt-in until independently qualified;
- no mesh-quality threshold change;
- no response acceptance threshold change;
- no benchmark expected-value change;
- no release authority or trust-root promotion;
- no `.github/workflows/*` changes;
- no further B01 numerical changes in this branch.

## Plan
1. Transplant only the three substantive V2 assets from #1254; exclude all ten temporary workflows.
2. Add an explicit V2 qualification-only producer/profile selector that does not replace the V1 production selector.
3. Add V2 production-response check/route using the frozen V2 definition without mutating V1 scripts.
4. Execute pre-observation quality first, then V2 production response/convergence.
5. If B01 #1258 is not fully qualified, retain B02D as stacked draft regardless of V2 result.

## Current state
- branch: agent/lafea-b02d-v2-clean-qualification-20260819
- stage: RECOVER_FROZEN_V2_ASSETS
- exact next action: transplant exact V2 generator, definition and pre-observation check blobs from #1254 and verify no temporary workflow content enters the branch.
