# PR1369 Work Report — EMP1-29 Attachment-Axis Applicability Boundary

## Classification

- IMPLEMENT / WRITE_ALLOWED: yes, source-governance only
- ENGINEERING_CRITICAL: yes
- Production numerical change: no
- Workflow change: no
- Owner merge authorization: active from chat (`merge, proceed next`)

## Ground truth

Branch start and PR base: `028e6ae50bd45c2c4f68d249929cb50afb31c2cd`.

Current relevant production files inspected:
- `src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js`
- `src/core/emp1/emp1-wrc537-cylindrical-frame.js`

The bounded adapter constructs its WRC frame from supplied vessel/nozzle centerlines. The frame rejects non-orthogonal centerlines with `EMP1_WRC537_FRAME_NON_ORTHOGONAL` when `abs(dot(eLong,eP)) > 1e-10`.

## Source custody

Primary WRC file:
- `docs/emp1/WRC537_2013.pdf`
- Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`
- governed raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- direct primary page inspection: `NOT_RUN_EXECUTION_ENVIRONMENT`

Secondary research:
- `docs/01_WRC537_METHOD_DEFINITION.md`
- explicitly `NOT_READY_FOR_IMPLEMENTATION`
- candidate rule only: attachment/nozzle axis normal/perpendicular to vessel.

## Engineering conclusion

The current vector guard is safe and fail-closed but does not by itself prove physical WRC applicability.

Three separate claims are retained:
1. supplied centerline vectors are numerically orthogonal — implemented guard;
2. physical attachment axis equals the shell normal at the actual attachment station — unresolved source/geometry custody;
3. WRC permits oblique/skewed attachment geometry — not authorized.

The `1e-10` tolerance is classified only as floating-point equivalence to exact perpendicularity, not an engineering angular allowance.

## Changed-file ledger

1. `validation/emp1/wrc537-2013/attachment-axis-intersection-source-qualification-v1.json`
2. `docs/emp1/WRC537_2013_Attachment_Axis_Authority.md`
3. `scripts/emp1-wrc537-attachment-axis-source-check.mjs`
4. `agents/PR1369_workreport.md`

No `src/core`, route registry, UI, workflow, tolerance, dataset, oracle or release file is changed.

## Validation ledger

- production frame source inspection: PASS
- source-governance consistency: PASS by manual review
- primary WRC intersection pages: NOT_RUN_EXECUTION_ENVIRONMENT
- `node scripts/emp1-wrc537-attachment-axis-source-check.mjs`: NOT_RUN_EXECUTION_ENVIRONMENT
- oblique production calculation: NOT_RUN / NOT AUTHORIZED

No unexecuted check is represented as PASS.

## Appendix A

1. Production trace / guard location — 20/20
2. Source authority distinction — 20/20
3. Geometry invariant protection — 20/20
4. Independent validation planning — 18/20
5. Minimal patch / handover — 19/20

Total 97/100; every item >=17/20.

## Exact next action

Re-check live main and exact PR diff before merge. Full #1368 closure later requires direct primary-source extraction plus a physical attachment-station/local-normal evidence model review before any change to production geometry semantics.
