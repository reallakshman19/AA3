import { expect, test } from '@playwright/test';

// A small, real InputXML fixture (2 elements, declared mm unit, one
// anchor restraint) -- the same fixture text already validated against
// the real production diagnose/prepare/compile chain by
// scripts/inputxml-run-request-cases-check.mjs and
// scripts/inputxml-linear-authored-physical-cases-check.mjs.
const INPUTXML = `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
  <UNITS>
    <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
    <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
    <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
    <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS>
  <PIPINGMODEL xmlns="" JOBNAME="E2E-CHECK">
    <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1200" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="168.3" WALL_THICK="7.11" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
      <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
    </PIPINGELEMENT>
    <PIPINGELEMENT FROM_NODE="20" TO_NODE="30" DELTA_X="1200" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100"/>
  </PIPINGMODEL>
</CAESARII>`;

test('real InputXML upload flows through Input, Error check, and Load-case authoring to Run', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'LFEA', exact: true }).click();

  // Step 1 (INPUT) / Step 2 (ERROR_CHECK) both route to the SOURCE host.
  const inputXmlPanel = page.locator('[data-role="linear-piping-inputxml-source-workflow"]');
  await expect(inputXmlPanel).toBeVisible();
  await page.setInputFiles('[data-role="linear-piping-inputxml-source-file"]', {
    name: 'e2e-check.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(INPUTXML, 'utf8'),
  });

  // The fixture's declared <LENGTH LABEL="MM"> is recognized directly --
  // no explicit unit-authority fallback interaction is needed for this
  // file. This real, non-placeholder pre-flight reaches WARN (the
  // DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1 default profile's honest
  // verdict on a real 2-element model), not a fabricated PASS.
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-status', 'WARN', { timeout: 15000 });

  // Accept the disclosed WARN limitations through the real reviewer UI,
  // not a bypass.
  await page.fill('[data-role="linear-piping-inputxml-reviewer"]', 'e2e-matrix-spec');
  await page.fill('[data-role="linear-piping-inputxml-review-reason"]', 'Real-UI Phase 7 e2e verification.');
  await page.click('[data-action="authorize-linear-piping-inputxml-prefea"]');
  await expect(inputXmlPanel).toHaveAttribute('data-pre-flight-authorized', 'true');

  // Step 3 (LOAD_CASE) has its own dedicated host, separate from SOURCE
  // and RESULTS -- author a real nodal force on a real node from the
  // uploaded model (node "20", from the fixture's own topology).
  await page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]').click();
  const loadCasePanel = page.locator('[data-role="lfea-pipeline-load-case-authoring-panel"]');
  await expect(loadCasePanel).toBeVisible();
  await expect(page.locator('[data-role="lfea-load-case-node"] option')).toHaveCount(3);
  await page.selectOption('[data-role="lfea-load-case-node"]', '20');
  await page.fill('[data-role="lfea-load-case-fx"]', '1500');
  await page.click('[data-action="add-lfea-load-case-load"]');
  await expect(page.locator('[data-role="lfea-load-case-authoring-row"]')).toHaveCount(1);
  await expect(page.locator('[data-role="lfea-load-case-authoring-row"]')).toContainText('Node 20');

  // Assemble & send to Run: a real authority supplement (self-disclosed
  // as fictional test data -- interfaceAuthority/nozzleAllowableProfiles/
  // b31Authority remain a human-supplied, cited artifact this tool never
  // fabricates, see the LFEA revamp plan's Phase 2 note) plus the
  // authored case must both reach the assembled run request.
  await page.evaluate(() => {
    const authorityInput = document.querySelector('[data-role="lfea-pipeline-authority-supplement-file"]');
    const supplement = {
      applicationId: 'E2E-MATRIX-APP',
      interfaceAuthority: { nodes: [] },
      nozzleAllowableProfiles: [],
      b31Authority: { code: 'B31.3', edition: 'FAKE-TEST-EDITION-NOT-A-REAL-CODE-CITATION' },
    };
    const file = new File([JSON.stringify(supplement)], 'authority.json', { type: 'application/json' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    authorityInput.files = dataTransfer.files;
    authorityInput.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('[data-role="lfea-pipeline-authority-supplement-status"]')).toContainText('Loaded');

  await page.click('[data-action="lfea-pipeline-assemble-and-run"]');
  // 2 cases: the auto-synthesized W case (this fixture has no pressure/
  // complete thermal data, so only W compiles) plus the one authored
  // nodal-force case -- the concrete proof authoring reaches assembly.
  await expect(page.locator('[data-role="lfea-pipeline-assemble-status"]')).toContainText('2 case(s)', { timeout: 10000 });
});
