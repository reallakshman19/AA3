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
    const reducers = projection.rows.filter((row) => row.elementType === 'REDUCER'
      && row.identity?.canonicalKind === 'EDGE'
      && row.custody?.catalogueAuthority === 'EXACT' && row.custody?.catalogue);
    const branchReducerCases = tee.identity.portBindings.map((branch) => {
      const reducerIds = reducers.flatMap((reducer) => {
        const from = reducer.identity.portBindings?.filter((item) => (
          item?.endpoint === 'FROM' && item?.nodeId
        )) ?? [];
        const to = reducer.identity.portBindings?.filter((item) => (
          item?.endpoint === 'TO' && item?.nodeId
        )) ?? [];
        if (from.length !== 1 || to.length !== 1 || from[0].nodeId === to[0].nodeId) return [];
        const endpoint = from[0].nodeId === branch.nodeId
          ? 'FROM' : to[0].nodeId === branch.nodeId ? 'TO' : null;
        if (!endpoint) return [];
        const dnIn = Number(reducer.fields?.dnInMm);
        const dnOut = Number(reducer.fields?.dnOutMm);
        if (![dnIn, dnOut].every((value) => Number.isFinite(value) && value > 0)
          || Math.abs(dnIn - dnOut) <= 1e-9) return [];
        const branchDn = endpoint === 'FROM' ? dnIn : dnOut;
        const downstreamDn = endpoint === 'FROM' ? dnOut : dnIn;
        return branchDn > downstreamDn + 1e-9 ? [reducer.identity.canonicalId] : [];
      }).sort();
      return { portKey: branch.portKey, nodeId: branch.nodeId, reducerIds };
    }).filter((entry) => entry.reducerIds.length > 0)
      .sort((left, right) => left.portKey.localeCompare(right.portKey));
    return {
      gateId: valveAuthority.gate.identity.canonicalId,
      ballRecordIds: valveAuthority.records.map((record) => record.recordId).sort(),
      catalogueHash: catalogue.catalogueHash,
      teeId: tee.identity.canonicalId,
      branchPortKeys: tee.identity.portBindings.map((entry) => entry.portKey).sort(),
      exactReducerIds: [],
      branchReducerCases,
    };
  });
}
