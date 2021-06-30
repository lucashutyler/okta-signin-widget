import ChallengeWebauthnView from 'v2/view-builder/views/webauthn/ChallengeWebauthnView';
import { BaseForm } from 'v2/view-builder/internals';
import AppState from 'v2/models/AppState';
import Settings from 'models/Settings';
import webauthn from 'util/webauthn';
import BrowserFeatures from 'util/BrowserFeatures';
import CryptoUtil from 'util/CryptoUtil';
import $sandbox from 'sandbox';
import Expect from 'helpers/util/Expect';
import ChallengeWebauthnResponse from '../../../../../../playground/mocks/data/idp/idx/authenticator-verification-webauthn';

describe('v2/view-builder/views/webauthn/ChallengeWebauthnView', function() {
  let testContext;
  beforeEach(function() {
    testContext = {};
    testContext.init = (
      currentAuthenticator = ChallengeWebauthnResponse.currentAuthenticator.value,
      authenticatorEnrollments = []
    ) => {
      const appState = new AppState({
        currentAuthenticator,
        authenticatorEnrollments,
      });
      spyOn(appState, 'getRemediationAuthenticationOptions').and.callFake(formName => {
        if (formName === 'select-authenticator-authenticate') {
          return [ { label: 'some authenticator '} ];
        }
        return [];
      });
      spyOn(appState, 'shouldShowSignOutLinkInCurrentForm').and.returnValue(false);
      const settings = new Settings({ baseUrl: 'http://localhost:3000' });
      const currentViewState = {
        name: 'challenge-authenticator',
        relatesTo: {
          value: currentAuthenticator,
        },
      };
      testContext.view = new ChallengeWebauthnView({
        el: $sandbox,
        appState,
        settings,
        currentViewState,
      });
      testContext.view.render();
    };
  });

  afterEach(function() {
    $sandbox.empty();
  });

  it('shows verify instructions and spinner when webauthn is supported and browser is not safari', function() {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    spyOn(BrowserFeatures, 'isSafari').and.callFake(() => false);
    testContext.init();
    expect(testContext.view.$('.idx-webauthn-verify-text').text()).toBe(
      'You will be prompted to use a security key or biometric verification (Windows Hello, Touch ID, etc.). Follow the instructions to complete verification.'
    );
    expect(testContext.view.$('.retry-webauthn').css('display')).toBe('none');
    expect(testContext.view.$('.okta-waiting-spinner').css('display')).toBe('block');
    expect(testContext.view.$('.webauthn-not-supported').length).toBe(0);
  });

  it('shows verify instructions and button when browser supports webauthn on safari', function() {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    spyOn(BrowserFeatures, 'isSafari').and.callFake(() => true);
    testContext.init();
    expect(testContext.view.$('.idx-webauthn-verify-text').text()).toBe(
      'You will be prompted to use a security key or biometric verification (Windows Hello, Touch ID, etc.). Follow the instructions to complete verification.'
    );
    expect(testContext.view.$('.retry-webauthn').css('display')).not.toBe('none');
    expect(testContext.view.$('.retry-webauthn').text()).toBe('Verify');
    expect(testContext.view.$('.webauthn-not-supported').length).toBe(0);
  });

  it('updated button text to "Retry" on click on safari', function() {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    spyOn(BrowserFeatures, 'isSafari').and.callFake(() => true);
    testContext.init();
    expect(testContext.view.$('.idx-webauthn-verify-text').text()).toBe(
      'You will be prompted to use a security key or biometric verification (Windows Hello, Touch ID, etc.). Follow the instructions to complete verification.'
    );
    expect(testContext.view.$('.retry-webauthn').css('display')).not.toBe('none'); // default value: empty string in jest, 'inline' in browser
    expect(testContext.view.$('.retry-webauthn').text()).toBe('Verify');
    testContext.view.$('.retry-webauthn').click();
    expect(testContext.view.$('.retry-webauthn').css('display')).toBe('none');
    expect(testContext.view.$('.retry-webauthn').text()).toBe('Retry');
  });

  it('shows verify instructions if there are existing enrollments', function() {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    spyOn(BrowserFeatures, 'isSafari').and.callFake(() => true);
    testContext.init(
      ChallengeWebauthnResponse.currentAuthenticator.value,
      ChallengeWebauthnResponse.authenticatorEnrollments
    );
    expect(testContext.view.$('.idx-webauthn-verify-text').text()).toBe(
      'You will be prompted to use a security key or biometric verification (Windows Hello, Touch ID, etc.). Follow the instructions to complete verification.'
    );
    expect(testContext.view.$('.retry-webauthn').css('display')).not.toBe('none'); // default value: empty string in jest, 'inline' in browser
    expect(testContext.view.$('.retry-webauthn').text()).toBe('Verify');
    expect(testContext.view.$('.webauthn-not-supported').length).toBe(0);
  });

  it('shows error when browser does not support webauthn', function() {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => false);
    testContext.init();
    expect(testContext.view.$('.idx-webauthn-verify-text').length).toBe(0);
    expect(testContext.view.$('.retry-webauthn').length).toBe(0);
    expect(testContext.view.$('.okta-waiting-spinner').length).toBe(0);
    expect(testContext.view.$('.webauthn-not-supported').length).toBe(1);
    expect(testContext.view.$('.webauthn-not-supported').text().trim()).toBe(
      'Security key or biometric authenticator is not supported on this browser. Contact your admin for assistance.'
    );
  });

  it('shows UV required callout when userVerification is "required"', function() {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    const currentAuthenticator = JSON.parse(
      JSON.stringify(ChallengeWebauthnResponse.currentAuthenticator.value)
    );
    currentAuthenticator.contextualData.challengeData.userVerification = 'required';
    testContext.init(currentAuthenticator);
    expect(testContext.view.$('.uv-required-callout').length).toBe(1);
    expect(testContext.view.$('.uv-required-callout').text().trim()).toBe(
      'Biometric verification or a PIN is required to sign in with this authenticator.'
    );
  });

  it('does not show UV required callout when userVerification is "discouraged"', function() {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    const currentAuthenticator = JSON.parse(
      JSON.stringify(ChallengeWebauthnResponse.currentAuthenticator.value)
    );
    currentAuthenticator.contextualData.challengeData.userVerification = 'discouraged';
    testContext.init(currentAuthenticator);
    expect(testContext.view.$('.uv-required-callout').length).toBe(0);
  });

  it('saveForm is called with model when credentials.get succeeds', function(done) {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    const assertion = {
      response: {
        clientDataJSON: 123,
        authenticatorData: 234,
        signature: 'magizh',
      },
    };
    spyOn(BaseForm.prototype, 'saveForm');
    spyOn(navigator.credentials, 'get').and.returnValue(Promise.resolve(assertion));

    testContext.init(
      ChallengeWebauthnResponse.currentAuthenticator.value,
      ChallengeWebauthnResponse.authenticatorEnrollments
    );
    Expect.waitForSpyCall(testContext.view.form.saveForm)
      .then(() => {
        expect(navigator.credentials.get).toHaveBeenCalledWith({
          publicKey: {
            allowCredentials: [
              {
                type: 'public-key',
                id: CryptoUtil.strToBin(
                  'hpxQXbu5R5Y2JMqpvtE9Oo9FdwO6z2kMR-ZQkAb6p6GSguXQ57oVXKvpVHT2fyCR_m2EL1vIgszxi00kyFIX6w'
                ),
              },
              {
                type: 'public-key',
                id: CryptoUtil.strToBin(
                  '7Ag2iWUqfz0SanWDj-ZZ2fpDsgiEDt_08O1VSSRZHpgkUS1zhLSyWYDrxXXB5VE_w1iiqSvPaRgXcmG5rPwB-w'
                ),
              },
            ],
            userVerification: 'required',
            challenge: CryptoUtil.strToBin(
              ChallengeWebauthnResponse.currentAuthenticator.value.contextualData.challengeData.challenge
            ),
          },
          signal: jasmine.any(Object),
        });
        expect(testContext.view.form.model.get('credentials')).toEqual({
          clientData: CryptoUtil.binToStr(assertion.response.clientDataJSON),
          authenticatorData: CryptoUtil.binToStr(assertion.response.authenticatorData),
          signatureData: CryptoUtil.binToStr(assertion.response.signature),
        });
        expect(testContext.view.form.saveForm).toHaveBeenCalledWith(testContext.view.form.model);
        expect(testContext.view.form.webauthnAbortController).toBe(null);
        done();
      })
      .catch(done.fail);
  });

  it('error with a name that not supported on login bundle is displayed when credentials.create fails', function(done) {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    spyOn(navigator.credentials, 'get').and.returnValue(Promise.reject({ message: 'error from browser' }));

    testContext.init();

    Expect.waitForCss('.infobox-error')
      .then(() => {
        expect(testContext.view.$('.infobox-error')[0].textContent.trim()).toBe('error from browser');
        expect(testContext.view.form.webauthnAbortController).toBe(null);
        done();
      })
      .catch(done.fail);
  });

  it('error with a name that supported on login bundle is displayed when credentials.create fails', function(done) {
    spyOn(webauthn, 'isNewApiAvailable').and.callFake(() => true);
    spyOn(navigator.credentials, 'get').and.returnValue(Promise.reject({
      message: 'error from browser',
      name: 'NotAllowedError',
    }));

    testContext.init();

    Expect.waitForCss('.infobox-error')
      .then(() => {
        expect(testContext.view.$('.infobox-error')[0].textContent.trim()).toBe('The operation either timed out or was not allowed.');
        expect(testContext.view.form.webauthnAbortController).toBe(null);
        done();
      })
      .catch(done.fail);
  });

  it('shows correct text when Can\'t verify? is clicked', function() {
    jest.spyOn(webauthn, 'isNewApiAvailable').mockReturnValue(true);
    jest.spyOn(BrowserFeatures, 'isSafari').mockReturnValue(false);
    testContext.init();
    expect(testContext.view.$('.idx-webauthn-verify-text').text()).toMatchInlineSnapshot(
      '"You will be prompted to use a security key or biometric verification (Windows Hello, Touch ID, etc.). Follow the instructions to complete verification."'
    );
    expect(testContext.view.$('.js-cant-verify').length).toBe(1);
    expect(testContext.view.$('.js-help-description').css('display')).toBe('none');
    const cantVerifyLink = document.getElementsByClassName('link js-cant-verify');
    cantVerifyLink[0].click();
    expect(testContext.view.$('.js-help-description').css('display')).toBe('block');
    expect(testContext.view.$('.js-help-description')[0].textContent).toMatchInlineSnapshot(
      '"Are you trying to use a biometric authenticator?Biometric authenticators (fingerprint, face recognition, PIN) will only work on the same device on which they were set up.If available, set up another security method on the device you used to set up your biometric authenticator.Are you trying to use a security key?If you have set up a security key, insert it in a USB port when prompted by the browser and tap on the button or gold disk. Security keys can work on multiple devices."'
    );
  });

  it('shows additional text when Can\'t verify? is clicked from Okta_Authenticator', function() {
    testContext.init = (
      currentAuthenticator = ChallengeWebauthnResponse.currentAuthenticator.value,
      authenticatorEnrollments = [],
      app = { name: 'Okta_Authenticator' },
    ) => {
      const appState = new AppState({
        currentAuthenticator,
        authenticatorEnrollments,
        app,
      });
      jest.spyOn(appState, 'getRemediationAuthenticationOptions').mockReturnValue(formName => {
        if (formName === 'select-authenticator-authenticate') {
          return [{label: 'some authenticator '}];
        }
        return [];
      });
      jest.spyOn(appState, 'shouldShowSignOutLinkInCurrentForm').mockReturnValue(false);
      const settings = new Settings({ baseUrl: 'http://localhost:3000' });
      const currentViewState = {
        name: 'challenge-authenticator',
        relatesTo: {
          value: currentAuthenticator,
        },
      };
      testContext.view = new ChallengeWebauthnView({
        el: $sandbox,
        appState,
        settings,
        currentViewState,
      });
      testContext.view.render();
    };
    jest.spyOn(webauthn, 'isNewApiAvailable').mockReturnValue(true);
    jest.spyOn(BrowserFeatures, 'isSafari').mockReturnValue(false);
    testContext.init();
    expect(testContext.view.$('.idx-webauthn-verify-text').text()).toMatchInlineSnapshot(
      '"You will be prompted to use a security key or biometric verification (Windows Hello, Touch ID, etc.). Follow the instructions to complete verification."'
    );
    expect(testContext.view.$('.js-cant-verify').length).toBe(1);
    expect(testContext.view.$('.js-help-description').css('display')).toBe('none');
    const cantVerifyLink = document.getElementsByClassName('link js-cant-verify');
    cantVerifyLink[0].click();
    expect(testContext.view.$('.js-help-description').css('display')).toBe('block');
    expect(testContext.view.$('.js-help-description')[0].textContent).toMatchInlineSnapshot(
      '"Open your Okta Dashboard (e.g. yourcompany.okta.com) on the device you used to setup your security key or biometric authenticatorGo to Settings > Security MethodsOn Okta Verify, click \\"Enable\\"Scan the QR code using Okta Verify and follow instructions to finish enrolling your account"'
    );
  });
});
