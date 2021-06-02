import { loc, createCallout } from 'okta';
import { BaseForm } from '../../internals';
import BaseAuthenticatorView from '../../components/BaseAuthenticatorView';

const OV_UV_ENABLE_BIOMETRIC_SERVER_KEY = 'oie.authenticator.oktaverify.method.totp.verify.enable.biometrics';

const Body = BaseForm.extend(
  {
    className: 'okta-verify-totp-challenge',

    modelEvents: {
      'error': '_checkGlobalError'
    },

    title() {
      return loc('oie.okta_verify.totp.title', 'login');
    },

    save() {
      return loc('mfa.challenge.verify', 'login');
    },

    _checkGlobalError(model, convertedErrors) {
      this.model.set('credentials.totp', '1234');
      const errorSummaryKeys = convertedErrors?.responseJSON?.errorSummaryKeys;
      if (errorSummaryKeys && errorSummaryKeys.includes(OV_UV_ENABLE_BIOMETRIC_SERVER_KEY)) {
        this.model.set('credentials.totp', '');
        this.add('<div class="ion-messages-container"></div>', '.o-form-error-container');
        const options = {
          type: 'error',
          className: 'okta-verify-uv-callout-content',
          title: loc('oie.authenticator.app.method.push.verify.enable.biometrics.title', 'login'),
          subtitle: loc('oie.authenticator.app.method.push.verify.enable.biometrics.description', 'login'),
          bullets: [
            loc('oie.authenticator.app.method.push.verify.enable.biometrics.point1', 'login'),
            loc('oie.authenticator.app.method.push.verify.enable.biometrics.point2', 'login'),
            loc('oie.authenticator.app.method.push.verify.enable.biometrics.point3', 'login')
          ],
        };
        this.add(createCallout(options), '.o-form-error-container');
      }
    },
  },
);

export default BaseAuthenticatorView.extend({
  Body,
});
