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
      throw new Error('Demo must expose a certified replaceable GATE valve and TEE row.');
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
