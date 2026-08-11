import { resolve } from 'node:path';
import { expect } from '@playwright/test';

const Q3_FIXTURE = resolve('public/fixtures/topology-edit-table-q3-exact.staged.json');

export async function openTopologyEditTableEngineeringFixture(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-role="dataset-file"]').setInputFiles(Q3_FIXTURE);
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(8);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime?.projection
  ))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.professionalRuntime?.catalogue?.catalogueHash
  ))).toBe(true);
  return host;
}

export async function engineeringEditorFixture(page) {
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const projection = controller?.tableAdapter?.runtime?.projection;
    const catalogue = controller?.professionalRuntime?.catalogue;
    if (!projection || !catalogue) {
      throw new Error('Table/catalogue authority unavailable for engineering editor check.');
    }
    const token = (value) => String(value ?? '').trim().toUpperCase();
    const compatibleText = (observed, candidate) => !token(observed)
      || token(observed) === token(candidate);
    const compatibleNumber = (observed, candidate) => {
      const value = Number(observed);
      return !Number.isFinite(value) || value <= 0
        || Math.abs(value - Number(candidate)) <= 1e-9;
    };
    const gates = projection.rows.filter((row) => row.elementType === 'VALVE'
      && String(row.fields?.valveType ?? '').toUpperCase() === 'GATE');
    const valveAuthority = gates.map((gate) => ({
      gate,
      records: catalogue.records.filter((record) => record.componentType === 'VALVE'
        && record.valveType === 'BALL'
        && compatibleNumber(gate.fields?.dnInMm, record.nominalSizeMm)
        && compatibleText(gate.fields?.pipingClass, record.pipingClass)
        && compatibleText(gate.fields?.pressureClass, record.pressureClass)
        && compatibleText(gate.fields?.endConnectionFrom, record.endConnectionFrom)
        && compatibleText(gate.fields?.endConnectionTo, record.endConnectionTo)),
    })).find((entry) => entry.records.length > 0);
    const tee = projection.rows.find((row) => row.elementType === 'TEE'
      && row.identity?.canonicalKind === 'JUNCTION');
    if (!valveAuthority || !tee) {
      throw new Error('Fixture must expose a certified replaceable GATE valve and TEE row.');
    }
    const exactReducerIds = projection.rows.filter((row) => row.elementType === 'REDUCER'
      && row.custody?.catalogueAuthority === 'EXACT' && row.custody?.catalogue)
      .map((row) => row.identity.canonicalId).sort();
    return {
      gateId: valveAuthority.gate.identity.canonicalId,
      ballRecordIds: valveAuthority.records.map((record) => record.recordId).sort(),
      catalogueHash: catalogue.catalogueHash,
      teeId: tee.identity.canonicalId,
      branchPortKeys: tee.identity.portBindings.map((entry) => entry.portKey).sort(),
      exactReducerIds,
    };
  });
}
