import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { createLfeaNativeEvidenceDossier } from './native-evidence-dossier.js';
import { createLfeaNativeVerification } from './native-verification.js';
import { mountLfeaNativeVerificationView } from './native-verification-view.js';

export function createLfeaNativeVerificationController(root) {
  let context = null;
  let verification = createLfeaNativeVerification();
  let verificationFingerprint = semanticHash(verification);
  let dossier = null;
  const view = mountLfeaNativeVerificationView(root, {
    onCreateDossier: () => createDossier(),
  });
  view.update(verification, dossier);

  function refresh(nextContext) {
    context = nextContext;
    const nextVerification = createLfeaNativeVerification(context);
    const nextFingerprint = semanticHash(nextVerification);
    if (nextFingerprint !== verificationFingerprint) dossier = null;
    verification = nextVerification;
    verificationFingerprint = nextFingerprint;
    if (verification.status !== 'CURRENT') dossier = null;
    view.update(verification, dossier);
    return verification;
  }

  function createDossier() {
    dossier = createLfeaNativeEvidenceDossier(verification);
    view.update(verification, dossier);
    return dossier;
  }

  return Object.freeze({
    refresh,
    createDossier,
    getVerification: () => verification,
    getDossier: () => dossier,
    getState: () => Object.freeze({ verification, dossier }),
    destroy() {
      context = null;
      verification = null;
      verificationFingerprint = null;
      dossier = null;
      view.destroy();
    },
  });
}
