import { RequestLogger, RequestMock, Selector } from 'testcafe';
import DeviceChallengePollPageObject from '../framework/page-objects/DeviceChallengePollPageObject';
import SelectAuthenticatorPageObject from '../framework/page-objects/SelectAuthenticatorPageObject';
import BasePageObject from '../framework/page-objects/BasePageObject';
import IdentityPageObject from '../framework/page-objects/IdentityPageObject';
import identify from '../../../playground/mocks/data/idp/idx/identify';
import identifyWithUserVerificationLoopback from '../../../playground/mocks/data/idp/idx/authenticator-verification-okta-verify-signed-nonce-loopback';
import identifyWithUserVerificationCustomURI from '../../../playground/mocks/data/idp/idx/authenticator-verification-okta-verify-signed-nonce-custom-uri';
import identifyWithSSOExtensionFallback from '../../../playground/mocks/data/idp/idx/identify-with-apple-sso-extension-fallback';
import identifyWithUserVerificationLaunchUniversalLink from '../../../playground/mocks/data/idp/idx/authenticator-verification-okta-verify-signed-nonce-universal-link';

const BEACON_CLASS = 'mfa-okta-verify';

let probeSuccess = false;
const loopbackSuccessLogger = RequestLogger(/introspect|probe|challenge/, { logRequestBody: true, stringifyRequestBody: true });
const loopbackSuccesskMock = RequestMock()
  .onRequestTo(/\/idp\/idx\/introspect/)
  .respond(identifyWithUserVerificationLoopback)
  .onRequestTo(/\/idp\/idx\/authenticators\/poll/)
  .respond((req, res) => {
    res.statusCode = '200';
    if (probeSuccess) {
      res.setBody(identify);
    } else {
      res.setBody(identifyWithUserVerificationLoopback);
    }
  })
  .onRequestTo(/2000|6511\/probe/)
  .respond(null, 500, { 
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'X-Okta-Xsrftoken, Content-Type'
  })
  .onRequestTo(/6512\/probe/)
  .respond(null, 200, { 
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'X-Okta-Xsrftoken, Content-Type'
  })
  .onRequestTo(/6512\/challenge/)
  .respond(null, 200, {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Origin, X-Requested-With, Content-Type, Accept, X-Okta-Xsrftoken',
    'access-control-allow-methods': 'POST, OPTIONS'
  });

const loopbackFallbackLogger = RequestLogger(/introspect|probe|cancel|launch|poll/);
const loopbackFallbackMock = RequestMock()
  .onRequestTo(/idp\/idx\/introspect/)
  .respond(identifyWithUserVerificationLoopback)
  .onRequestTo(/2000|6511|6512|6513\/probe/)
  .respond(null, 500, { 'access-control-allow-origin': '*' })
  .onRequestTo(/\/idp\/idx\/authenticators\/poll\/cancel/)
  .respond(identifyWithUserVerificationCustomURI)
  .onRequestTo(/\/idp\/idx\/authenticators\/poll/)
  .respond(identifyWithUserVerificationCustomURI);

const identifyWithLaunchAuthenticatorHttpCustomUri = JSON.parse(JSON.stringify(identifyWithUserVerificationCustomURI));
const mockHttpCustomUri = 'http://localhost:6512/launch-okta-verify';
// replace custom URI with http URL so that we can mock and verify
identifyWithLaunchAuthenticatorHttpCustomUri.currentAuthenticator.value.contextualData.challenge.value.href = mockHttpCustomUri;

const customURILogger = RequestLogger(/launch-okta-verify/);
const customURIMock = RequestMock()
  .onRequestTo(/idp\/idx\/introspect/)
  .respond(identifyWithLaunchAuthenticatorHttpCustomUri)
  .onRequestTo(/\/idp\/idx\/authenticators\/okta-verify\/launch/)
  .respond(identifyWithUserVerificationCustomURI)
  .onRequestTo(/\/idp\/idx\/authenticators\/poll/)
  .respond(identifyWithLaunchAuthenticatorHttpCustomUri)
  .onRequestTo(mockHttpCustomUri)
  .respond('<html><h1>open universal link</h1></html>');

const identifyWithSSOExtensionFallbackWithoutLink = JSON.parse(JSON.stringify(identifyWithSSOExtensionFallback));
// remove the universal link so that Util.redirect does not open a link and the rest of the flow can be verified
delete identifyWithSSOExtensionFallbackWithoutLink.authenticatorChallenge.value.href;
// replace universal link with http URL so that we can mock and verify
identifyWithUserVerificationLaunchUniversalLink.currentAuthenticator.value.contextualData.challenge.value.href = mockHttpCustomUri;
const universalLinkWithoutLaunchMock = RequestMock()
  .onRequestTo(/idp\/idx\/introspect/)
  .respond(identifyWithSSOExtensionFallbackWithoutLink)
  .onRequestTo(/\/idp\/idx\/authenticators\/okta-verify\/launch/)
  .respond(identifyWithUserVerificationLaunchUniversalLink)
  .onRequestTo(mockHttpCustomUri)
  .respond('<html><h1>open universal link</h1></html>')
  .onRequestTo(/\/idp\/idx\/authenticators\/poll/)
  .respond(identifyWithUserVerificationLaunchUniversalLink);

const identifyWithSSOExtensionFallbackTarget = JSON.parse(JSON.stringify(identifyWithSSOExtensionFallback));
// replace universal link with http URL so that we can mock and verify
identifyWithSSOExtensionFallbackTarget.authenticatorChallenge.value.href = mockHttpCustomUri;
const universalLinkMock = RequestMock()
  .onRequestTo(/idp\/idx\/introspect/)
  .respond(identifyWithSSOExtensionFallbackTarget)
  .onRequestTo(mockHttpCustomUri)
  .respond('<html><h1>open universal link</h1></html>');

fixture('Device Challenge Polling View for user verification and MFA with the Loopback Server, Custom URI and Universal Link approaches');

async function setup(t) {
  const deviceChallengePollPage = new DeviceChallengePollPageObject(t);
  await deviceChallengePollPage.navigateToPage();
  return deviceChallengePollPage;
}

async function setupLoopbackFallback(t) {
  const deviceChallengeFalllbackPage = new IdentityPageObject(t);
  await deviceChallengeFalllbackPage.navigateToPage();
  return deviceChallengeFalllbackPage;
}

test
  .requestHooks(loopbackSuccessLogger, loopbackSuccesskMock)('in loopback server approach, probing and polling requests are sent and responded', async t => {
    const deviceChallengePollPageObject = await setup(t);
    await t.expect(deviceChallengePollPageObject.getBeaconClass()).contains(BEACON_CLASS);
    await t.expect(deviceChallengePollPageObject.getHeader()).eql('Verifying your identity');
    await t.expect(deviceChallengePollPageObject.getFooterCancelPollingLink().exists).eql(false);
    await t.expect(deviceChallengePollPageObject.getFooterSwitchAuthenticatorLink().innerText).eql('Verify with something else');
    await t.expect(deviceChallengePollPageObject.getFooterSignOutLink().innerText).eql('Back to sign in');
    await t.expect(loopbackSuccessLogger.count(
      record => record.response.statusCode === 200 &&
      record.request.method !== 'options' &&
        record.request.url.match(/introspect|6512/)
    )).eql(3);
    await t.expect(loopbackSuccessLogger.count(
      record => record.response.statusCode === 200 &&
        record.request.url.match(/challenge/) &&
        record.request.body.match(/challengeRequest":"eyJraWQiOiJW/)
    )).eql(1);
    // Check if pre-flight HTTP requests were sent
    await t.expect(loopbackSuccessLogger.count(
      record => record.response.statusCode === 500 &&
      record.request.method === 'options' &&
        record.request.url.match(/2000|6511/)
    )).eql(2);
    probeSuccess = true;
    await t.expect(loopbackSuccessLogger.contains(record => record.request.url.match(/6513/))).eql(false);
    const identityPage = new IdentityPageObject(t);
    await identityPage.fillIdentifierField('Test Identifier');
    await t.expect(identityPage.getIdentifierValue()).eql('Test Identifier');
  });

test
  .requestHooks(loopbackFallbackLogger, loopbackFallbackMock)('loopback fails and falls back to custom uri', async t => {
    loopbackFallbackLogger.clear();
    await setupLoopbackFallback(t);
    const deviceChallengePollPageObject = new DeviceChallengePollPageObject(t);
    await t.expect(deviceChallengePollPageObject.getBeaconClass()).contains(BEACON_CLASS);
    await t.expect(deviceChallengePollPageObject.getHeader()).eql('Click "Open Okta Verify" on the browser prompt');
    const content = deviceChallengePollPageObject.getContent();
    await t.expect(content).contains('Didn’t get a prompt?');
    await t.expect(content).contains('Launch Okta Verify');
    await t.expect(content).contains('Don’t have Okta Verify?');
    await t.expect(content).contains('Download here');
    await t.expect(deviceChallengePollPageObject.getDownloadOktaVerifyLink()).eql('https://apps.apple.com/us/app/okta-verify/id490179405');
    await t.expect(deviceChallengePollPageObject.getFooterLink().exists).notOk();
    await t.expect(deviceChallengePollPageObject.getFooterSwitchAuthenticatorLink().innerText).eql('Verify with something else');
    await t.expect(deviceChallengePollPageObject.getFooterSignOutLink().innerText).eql('Back to sign in');
    await deviceChallengePollPageObject.clickSwitchAuthenticatorButton();
    const secondSelectAuthenticatorPageObject = new SelectAuthenticatorPageObject(t);
    await t.expect(secondSelectAuthenticatorPageObject.getFormTitle()).eql('Verify it\'s you with an authenticator');
  });

test
  .requestHooks(customURILogger, customURIMock)('in custom URI approach, Okta Verify is launched', async t => {
    const deviceChallengePollPageObject = await setup(t);
    await t.expect(customURILogger.count(
      record => record.request.url.match(/launch-okta-verify/)
    )).eql(1);
    await deviceChallengePollPageObject.clickLaunchOktaVerifyLink();
    await t.expect(customURILogger.count(
      record => record.request.url.match(/launch-okta-verify/)
    )).eql(2);
  });

test
  .requestHooks(loopbackFallbackLogger, universalLinkWithoutLaunchMock)('SSO Extension fails and falls back to universal link', async t => {
    loopbackFallbackLogger.clear();
    const deviceChallengeFalllbackPage = await setupLoopbackFallback(t);
    await t.expect(deviceChallengeFalllbackPage.getPageTitle()).eql('Sign In');
    await t.expect(loopbackFallbackLogger.count(
      record => record.response.statusCode === 200 &&
        record.request.url.match(/introspect/)
    )).eql(1);
    deviceChallengeFalllbackPage.clickOktaVerifyButton();
    const deviceChallengePollPageObject = new DeviceChallengePollPageObject(t);
    await t.expect(deviceChallengePollPageObject.getBeaconClass()).contains(BEACON_CLASS);
    await t.expect(deviceChallengePollPageObject.getHeader()).eql('Sign in using Okta Verify on this device');
    await t.expect(deviceChallengePollPageObject.getSpinner().getStyleProperty('display')).eql('block');
    await t.expect(deviceChallengePollPageObject.getPrimiaryButtonText()).eql('Reopen Okta Verify');
    await t.expect(deviceChallengePollPageObject.getFooterLink().exists).eql(false);
    await t.expect(deviceChallengePollPageObject.getFooterCancelPollingLink().exists).eql(false);
    await t.expect(deviceChallengePollPageObject.getFooterSwitchAuthenticatorLink().innerText).eql('Verify with something else');
    await t.expect(deviceChallengePollPageObject.getFooterSignOutLink().innerText).eql('Back to sign in');
    deviceChallengePollPageObject.clickUniversalLink();
    await t.expect(Selector('h1').innerText).eql('open universal link');
    await t.expect(await (new BasePageObject()).getPageUrl()).contains(mockHttpCustomUri);
  });

test
  .requestHooks(loopbackFallbackLogger, universalLinkMock)('clicking the launch Okta Verify button opens the universal link', async t => {
    loopbackFallbackLogger.clear();
    const deviceChallengeFalllbackPage = await setupLoopbackFallback(t);
    await t.expect(deviceChallengeFalllbackPage.getPageTitle()).eql('Sign In');
    await t.expect(loopbackFallbackLogger.count(
      record => record.response.statusCode === 200 &&
        record.request.url.match(/introspect/)
    )).eql(1);
    deviceChallengeFalllbackPage.clickOktaVerifyButton();
    await t.expect(Selector('h1').innerText).eql('open universal link');
    await t.expect(await (new BasePageObject()).getPageUrl()).contains(mockHttpCustomUri);
  });
