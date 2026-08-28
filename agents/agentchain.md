# Engineering Agent Chain

AGENTCHAIN_VERSION: 2

EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: REPOSITORY_ENGINEERING_RELAY
MERGE_AUTHORITY: OWNER_ONLY_UNLESS_EXPLICITLY_GRANTED

## ACTIVE CHAINS

| Chain | Mission | Latest endpoint | Endpoint file | PR | State | Authority domain | Next action |
|---|---|---|---|---|---|---|---|
| EMP1-1389-P0-SOURCE-CLOSURE | Reconcile #1389 professional P0/current-state after source-semantic increments without widening runtime/release authority | EP-0002 | agents/agentchain/EMP1-1389-P0-SOURCE-CLOSURE/EP-0002.md | #1502 | READY_FOR_OWNER_MERGE_DECISION | EMP.1 WRC source/current-state governance | Obtain explicit owner merge authorization; if granted, re-ground live merge gate before merge |
| LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME | Connect target-level Product engineering defaults to ordinary Common Input resolution without inventing values | EP-LC1321-PD-0004 | agents/agentchain/LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME/EP-LC1321-PD-0004.md | #1504 | BLOCKED | Load Calc field-resolution/default authority plumbing | Obtain a faithful checkout of exact #1504 head b088ca4dbe5fb49a8ba31ceb26878a2e9760d99a and run the focused Product-default ordinary-resolution check first. |
| LAFEA-B02D-V2-GOVERNING-RESPONSE | Recover and continue frozen B02D-V2 governing T6/L4 response authority after merged #1490 | EP-B02D-GR-0007 | agents/agentchain/LAFEA-B02D-V2-GOVERNING-RESPONSE/EP-B02D-GR-0007.md | #1503 | BLOCKED | LAFEA.3 B02D-V2 governing-response evidence; takeover qualified | Obtain an exact-current executable checkout/runner and run the B02D V2 governing-response exact-head check |

## ENDPOINT LOG

| Endpoint | Chain | Leg | Checkpoint head | State | Locator |
|---|---|---|---|---|---|
| EP-0001 | ADV-ENG-DELIVERY-V2-PILOT | LEG-A | 4d18fca2f049b3a8b7b1dc64594189d51fd9645a | QUALIFICATION_REQUIRED | agents/agentchain/ADV-ENG-DELIVERY-V2-PILOT/EP-0001.md |
| EP-0002 | ADV-ENG-DELIVERY-V2-PILOT | LEG-B | 3cfbb53c58b1978d914e3cae710fe1bf3232fda4 | QUALIFICATION_REQUIRED | agents/agentchain/ADV-ENG-DELIVERY-V2-PILOT/EP-0002.md |
| EP-0003 | ADV-ENG-DELIVERY-V2-PILOT | LEG-C | beccd785b1620e230b2f6556805fef7f6e72fc1d | READY_FOR_NEXT_LEG | agents/agentchain/ADV-ENG-DELIVERY-V2-PILOT/EP-0003.md |
| EP-0004 | ADV-ENG-DELIVERY-V2-PILOT | LEG-C | 7b2e9add0894cb7e2be4794382f21d6bf82c941e | COMPLETE | agents/agentchain/ADV-ENG-DELIVERY-V2-PILOT/EP-0004.md |
| EP-0001 | EMP1-1389-P0-SOURCE-CLOSURE | LEG-POST-1499-STATE | 81c2e780a03d565345457b07609fe19d8d1421e4 | IN_PROGRESS | agents/agentchain/EMP1-1389-P0-SOURCE-CLOSURE/EP-0001.md |
| EP-0002 | EMP1-1389-P0-SOURCE-CLOSURE | LEG-POST-1499-STATE | b567bb8b6d97766a63a34f8d0adecd93a137328b | READY_FOR_OWNER_MERGE_DECISION | agents/agentchain/EMP1-1389-P0-SOURCE-CLOSURE/EP-0002.md |
| EP-LC1321-PD-0001 | LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME | LEG-A | 81c2e780a03d565345457b07609fe19d8d1421e4 | ACTIVE | agents/agentchain/LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME/EP-LC1321-PD-0001.md |
| EP-LC1321-PD-0002 | LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME | LEG-A | ecbc03b71c14c91311722425ba1d18be88b44025 | SOURCE_COMPLETE_EXECUTION_NOT_RUN | agents/agentchain/LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME/EP-LC1321-PD-0002.md |
| EP-LC1321-PD-0003 | LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME | LEG-A | b07d1f43aa97e0523c1ce8ebcff0177af2d5e6a1 | READY_FOR_NEXT_LEG | agents/agentchain/LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME/EP-LC1321-PD-0003.md |
| EP-LC1321-PD-0004 | LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME | LEG-B | b088ca4dbe5fb49a8ba31ceb26878a2e9760d99a | BLOCKED | agents/agentchain/LOAD-CALC-1321-PRODUCT-DEFAULT-RUNTIME/EP-LC1321-PD-0004.md |
| EP-0005 | LAFEA-B02D-V2-GOVERNING-RESPONSE | LEG-01-RECOVERY | ef08018e72b379c6908c494a59ddbe6afb8b332a | QUALIFICATION_REQUIRED | agents/agentchain/LAFEA-B02D-V2-GOVERNING-RESPONSE/EP-0005.md |
| EP-0006 | LAFEA-B02D-V2-GOVERNING-RESPONSE | LEG-01-RECOVERY | 8eeacf8b01e9146e0b3a2c001b8adf1c006923ea | BLOCKED | agents/agentchain/LAFEA-B02D-V2-GOVERNING-RESPONSE/EP-0006.md |
| EP-B02D-GR-0007 | LAFEA-B02D-V2-GOVERNING-RESPONSE | LEG-01-RECOVERY | 2fa2999d934d9caf80d3b2d4d1aa6797266a01a8 | BLOCKED | agents/agentchain/LAFEA-B02D-V2-GOVERNING-RESPONSE/EP-B02D-GR-0007.md |
