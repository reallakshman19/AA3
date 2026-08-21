# WRC 537 (2013 retained copy) — Cylindrical applicability ledger

This file is a concise implementation ledger, not a replacement for the bulletin. The retained project source is the 2013 WRC 537 copy/errata already pinned by the EMP.1 dataset. Exact engineering use remains subject to source-custody qualification.

| Rule | Retained source locator | Software interpretation |
|---|---|---|
| Radial-load cylinder length | WRC 537 §4.5.1, p.25 | For radial load `P`, `l < Rm` is not applicable. Equality `l = Rm` is not excluded, so the implemented boundary is `l >= Rm`. |
| External overturning moment near cylinder end | WRC 537 §4.5.2, p.25 | For `Mc` or `Ml`, attachment distance to the nearest cylinder end must be at least `0.5 Rm`. Equality passes. |
| Attachment/nozzle stress scope | WRC 537 §4.5.3, p.25 | The procedure calculates stresses in the shell, not in the attachment/nozzle. Nozzle/attachment stress must not be represented as a WRC 537 result. |

## Deliberate non-inferences

- §4.5.1 is implemented as a radial-load rule; it is not silently generalized to shear-only or torsion-only loading.
- §4.5.2 is applied to overturning moments `Mc`/`Ml`; no additional end-distance criterion is invented here for pure shear or torsion.
- Current cylinder-length and nearest-end-distance locators are not yet parsed from an independently qualified source model. Until that source path is qualified, production route authority remains false.
