import { ClientFunction, RequestLogger, RequestMock } from 'testcafe';
import xhrEmailVerification from '../../../playground/mocks/data/idp/idx/authenticator-verification-email';
import xhrIdentify from '../../../playground/mocks/data/idp/idx/identify';
import xhrSuccess from '../../../playground/mocks/data/idp/idx/success';
import ChallengeEmailPageObject from '../framework/page-objects/ChallengeEmailPageObject';
import IdentityPageObject from '../framework/page-objects/IdentityPageObject';
import SuccessPageObject from '../framework/page-objects/SuccessPageObject';
import { getStateHandleFromSessionStorage } from '../framework/shared';

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
  // Add challenge success mock
  const challengeSuccessMock = RequestMock()
    // .onRequestTo('http://localhost:3000/idp/idx/introspect')
    // .respond(xhrEmailVerification)
    .onRequestTo('http://localhost:3000/idp/idx/challenge/answer')
    .respond(xhrSuccess);
  await t.addRequestHooks(challengeSuccessMock);
  
  const identityPage = new IdentityPageObject(t);
  const challengeEmailPageObject = new ChallengeEmailPageObject(t);
  const successPage = new SuccessPageObject(t);
  let pageTitle;

  // Identify page
  await identityPage.navigateToPage();
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

  // Success page
  const pageUrl = await successPage.getPageUrl();
  await t.expect(pageUrl)
    .eql('http://localhost:3000/app/UserHome?stateToken=mockedStateToken123');
  await t.expect(getStateHandleFromSessionStorage()).eql(null);
});