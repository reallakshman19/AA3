# WRC 537 (2013 retained copy) — Eight-point extrema authority

This ledger records the implementation consequence of WRC 537 §4.3.6 for cylindrical shells. It does not create an interpolation method or a continuous circumferential stress search that is absent from the qualified EMP.1 route.

## Source statement and engineering consequence

WRC 537 §4.3.6 describes evaluation of membrane, bending, and shear stresses at eight shell-juncture points under arbitrary loading. The same discussion states that there is no assurance that the absolute maximum shell stress intensity occurs at one of those eight points; an intermediate location around the juncture can govern, including circumstances associated with longitudinal moment discussed in §4.4 and Appendix A.

Therefore the software contract is:

- `stressIntensity[8]` is the set of stress intensities at the eight WRC Table-5 points only;
- `MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY` may be reported as a bounded envelope over those eight evaluated points;
- that envelope is **not** an absolute/global shell maximum;
- no continuous circumferential or intermediate-point search is claimed or performed by this route;
- arbitrary-loading extrema outside the eight points remain an engineering-judgment / method-extension issue, not a value to infer from Table 5.

## Non-inference

The implementation deliberately does not interpolate stresses around the attachment circumference, extrapolate the eight locations, or synthesize an off-axis global maximum. Any future continuous/off-axis search requires its own source authority, equations, validation cases, and qualification record.
