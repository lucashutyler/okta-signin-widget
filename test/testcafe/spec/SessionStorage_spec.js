import { ClientFunction, RequestLogger, RequestMock } from 'testcafe';
import xhrEmailVerification from '../../../playground/mocks/data/idp/idx/authenticator-verification-email';
import xhrIdentify from '../../../playground/mocks/data/idp/idx/identify';
import xhrSuccess from '../../../playground/mocks/data/idp/idx/success';
import xhrSuccessWithInteractionCode from '../../../playground/mocks/data/idp/idx/success-with-interaction-code';
import xhrSuccessTokens from '../../../playground/mocks/data/oauth2/success-tokens.json';
import ChallengeEmailPageObject from '../framework/page-objects/ChallengeEmailPageObject';
import IdentityPageObject from '../framework/page-objects/IdentityPageObject';
import SuccessPageObject from '../framework/page-objects/SuccessPageObject';
import { getStateHandleFromSessionStorage, renderWidget } from '../framework/shared';

const identifyChallengeMock = RequestMock()
  .onRequestTo('http://localhost:3000/idp/idx/introspect')
  .respond(xhrIdentify)
  .onRequestTo('http://localhost:3000/idp/idx/identify')
  .respond(xhrEmailVerification)
  .onRequestTo('http://localhost:3000/idp/idx/challenge/poll')
  .respond(xhrEmailVerification)
  .onRequestTo('http://localhost:3000/idp/idx/cancel')
  .respond(xhrIdentify);


fixture('Session Storage - manage state in client side')
  .afterEach(() => {
    ClientFunction(() => { window.sessionStorage.clear(); });
  });


test.requestHooks(identifyChallengeMock)('shall back to sign-in and authenticate succesfully', async t => {
  const identityPage = new IdentityPageObject(t);
  const challengeEmailPageObject = new ChallengeEmailPageObject(t);
  let pageTitle;

  // Add mocks for interaction code flow
  const challengeSuccessMock = RequestMock()
    .onRequestTo('http://localhost:3000/idp/idx/challenge/answer')
    .respond(xhrSuccessWithInteractionCode)
    .onRequestTo('http://localhost:3000/oauth2/default/v1/token')
    .respond(xhrSuccessTokens)
  await t.addRequestHooks(challengeSuccessMock);

  // Setup widget with interaction code flow
  const optionsForInteractionCodeFlow = {
    clientId: 'fake',
    useInteractionCodeFlow: true,
    codeVerifier: 'fake',
    codeChallenge: 'totally_fake',
    codeChallengeMethod: 'S256',
    authParams: {
      ignoreSignature: true,
      pkce: true,
    },
    stateToken: undefined
  };
  await identityPage.navigateToPage({ render: false });
  await identityPage.mockCrypto();
  await t.setNativeDialogHandler(() => true);
  await renderWidget(optionsForInteractionCodeFlow);

  // Identify page
  await identityPage.fillIdentifierField('foo@test.com');
  await identityPage.clickNextButton();

  // Email challenge page - click 'Back to sign-in'
  pageTitle = challengeEmailPageObject.form.getTitle();
  await t.expect(pageTitle).eql('Verify with your email');
  await challengeEmailPageObject.clickSignOutLink();

  // Go back to Identify page
  pageTitle = identityPage.form.getTitle();
  await t.expect(pageTitle).eql('Sign In');
  await identityPage.fillIdentifierField('foo@test.com');
  await identityPage.clickNextButton();

  // Email challenge page - verify
  pageTitle = challengeEmailPageObject.form.getTitle();
  await t.expect(pageTitle).eql('Verify with your email');
  await challengeEmailPageObject.verifyFactor('credentials.passcode', '1234');
  await challengeEmailPageObject.clickNextButton();
  
  // Check success
  const history = await t.getNativeDialogHistory();
  await t
    .expect(history.length).eql(1)
    .expect(history[0].text).eql('SUCCESS: OIDC with single responseType. Check Console');
});