import { createLfeaNativeEvidenceDossier } from './native-evidence-dossier.js';
import { createLfeaNativeVerification } from './native-verification.js';
import { mountLfeaNativeVerificationView } from './native-verification-view.js';

export function createLfeaNativeVerificationController(root) {
  let context = null;
  let verification = createLfeaNativeVerification();
  let dossier = null;
  const view = mountLfeaNativeVerificationView(root, {
    onCreateDossier: () => createDossier(),
  });
  view.update(verification, dossier);

  function refresh(nextContext) {
    context = nextContext;
    verification = createLfeaNativeVerification(context);
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
      dossier = null;
      view.destroy();
    },
  });
}
