import {loc, createButton, createCallout, _, $, View} from 'okta';
import { BaseForm } from '../../internals';
import BaseAuthenticatorView from '../../components/BaseAuthenticatorView';
import CryptoUtil from '../../../../util/CryptoUtil';
import webauthn from '../../../../util/webauthn';
import BrowserFeatures from '../../../../util/BrowserFeatures';
import ChallengeWebauthnInfoView from './ChallengeWebauthnInfoView';
import { getMessageFromBrowserError } from '../../../ion/i18nTransformer';
import AuthenticatorFooter from '../../components/AuthenticatorFooter';
import { getBackToSignInLink } from '../../utils/LinksUtil';
import Link from '../../components/Link';
import hbs from 'handlebars-inline-precompile';

const CantVerifyInfoVerifyFlowTemplate = View.extend({
  id: 'help-description-container',
  className: 'help-description js-help-description',
  template: hbs`
    <div className="help-description js-help-description" id="help-description-container">
      <h3>{{i18n code="oie.verify.webauthn.cant.verify.biometric.authenticator.title" bundle="login"}}</h3><br>
      <p>{{i18n code="oie.verify.webauthn.cant.verify.biometric.authenticator.description1" bundle="login"}}</p><br>
      <p>{{i18n code="oie.verify.webauthn.cant.verify.biometric.authenticator.description2" bundle="login"}}</p><br>
      <h3>{{i18n code="oie.verify.webauthn.cant.verify.security.key.title" bundle="login"}}</h3><br>
      <p>{{i18n code="oie.verify.webauthn.cant.verify.security.key.description" bundle="login"}}</p><br>
    </div>
  `,
});

const CantVerifyInfoOVEnrollmentFlowTemplate = View.extend({
  id: 'help-description-container',
  className: 'help-description js-help-description',
  template: hbs`
    <div className="help-description js-help-description" id="help-description-container">
      <ol class="ov-enrollment-info">
        <li>{{i18n code="oie.verify.webauthn.cant.verify.enrollment.step1" bundle="login"}}</li><br>
        <li>{{i18n code="oie.verify.webauthn.cant.verify.enrollment.step2" bundle="login"}}</li><br>
        <li>{{i18n code="oie.verify.webauthn.cant.verify.enrollment.step3" bundle="login"}}</li><br>
        <li>{{i18n code="oie.verify.webauthn.cant.verify.enrollment.step4" bundle="login"}}</><br>
      </ol>
    </div>
  `,
});

const Body = BaseForm.extend({

  title() {
    return loc('oie.verify.webauth.title', 'login');
  },

  className: 'oie-verify-webauthn',

  getUISchema() {
    const schema = [];
    // Returning custom array so no input fields are displayed for webauthn
    if (webauthn.isNewApiAvailable()) {
      const retryButton = createButton({
        className: 'retry-webauthn button-primary default-custom-button',
        title: loc('mfa.challenge.verify', 'login'),
        click: () => {
          this.getCredentialsAndSave();
        }
      });

      schema.push({
        View: ChallengeWebauthnInfoView,
      }, {
        View: retryButton,
      });
    } else {
      schema.push({
        View: createCallout({
          className: 'webauthn-not-supported',
          type: 'error',
          subtitle: loc('oie.webauthn.error.not.supported', 'login'),
        }),
      });
    }
    return schema;
  },

  remove() {
    BaseForm.prototype.remove.apply(this, arguments);
    if (this.webauthnAbortController) {
      this.webauthnAbortController.abort();
      this.webauthnAbortController = null;
    }
  },

  noButtonBar: true,

  modelEvents: {
    'error': '_stopVerification'
  },

  getCredentialsAndSave() {
    this.clearErrors();
    this._startVerification();
    this.webauthnAbortController = new AbortController();
    const relatesToObject = this.options.currentViewState.relatesTo;
    const authenticatorData = relatesToObject?.value || {};
    const allowCredentials = [];
    const authenticatorEnrollments = this.options.appState.get('authenticatorEnrollments').value || [];
    authenticatorEnrollments.forEach((enrollement) => {
      if (enrollement.key === 'webauthn') {
        allowCredentials.push({
          type: 'public-key',
          id: CryptoUtil.strToBin(enrollement.credentialId),
        });
      }
    });
    const options = {
      allowCredentials,
      userVerification: authenticatorData.contextualData.challengeData.userVerification,
      challenge: CryptoUtil.strToBin(authenticatorData.contextualData.challengeData.challenge),
    };
    navigator.credentials.get({
      publicKey: options,
      signal: this.webauthnAbortController.signal
    }).then((assertion) => {
      this.model.set({
        credentials : {
          clientData: CryptoUtil.binToStr(assertion.response.clientDataJSON),
          authenticatorData: CryptoUtil.binToStr(assertion.response.authenticatorData),
          signatureData: CryptoUtil.binToStr(assertion.response.signature),
        }
      });
      this.saveForm(this.model);
    }, (error) => {
      // Do not display if it is abort error triggered by code when switching.
      // this.webauthnAbortController would be null if abort was triggered by code.
      if (this.webauthnAbortController) {
        this.model.trigger('error', this.model, {responseJSON: {errorSummary: getMessageFromBrowserError(error)}});
      }
    }).finally(() => {
      // unset webauthnAbortController on successful authentication or error
      this.webauthnAbortController = null;
    });
  },

  _startVerification: function() {
    this.$('.okta-waiting-spinner').show();
    this.$('.retry-webauthn').hide();
    this.$('.retry-webauthn')[0].textContent = loc('retry', 'login');
  },

  _stopVerification: function() {
    this.$('.okta-waiting-spinner').hide();
    this.$('.retry-webauthn').show();
  }
});

const Footer = AuthenticatorFooter.extend({
  props: {
    enabled: ['boolean', false]
  },

  events: {
    'click .js-cant-verify': function(e) {
      e.preventDefault();
      if (!this.props.enabled) {
        return;
      }
      this.toggleLinks(e);
    },
  },

  initialize: function() {
    let links = _.resultCtx(this, 'links', this);
    const footerInfo = _.resultCtx(this, 'footerInfo', this);
    const hasBackToSignInLink = _.resultCtx(this, 'hasBackToSignInLink', this);

    if (!Array.isArray(links)) {
      links = [];
    } else {
      links = links.filter(l => $.isPlainObject(l));
    }

    if (this.options.appState.shouldShowSignOutLinkInCurrentForm(
      this.options.settings.get('features.hideSignOutLinkInMFA') ||
      this.settings.get('features.mfaOnlyFlow')) && hasBackToSignInLink) {
      links = links.concat(getBackToSignInLink(this.options.settings));
    }

    links.forEach(link => {
      this.add(Link, {
        options: link,
      });
      if (link.name === 'cant-verify') {
        if (this.options.appState.get('app') && this.options.appState.get('app').name === 'Okta_Authenticator') {
          this.add(CantVerifyInfoOVEnrollmentFlowTemplate);
        } else {
          this.add(CantVerifyInfoVerifyFlowTemplate);
        }
      }
    });

    if (footerInfo) {
      this.add(View.extend({
        className: 'footer-info',
      }));

      this.add(footerInfo, '.footer-info');
    }

    this.listenTo(this.props.enabled, 'change:enabled', function(model, enable) {
      this.$('.link').toggleClass('o-form-disabled', !enable);
    });
  },

  links: function() {
    let links = AuthenticatorFooter.prototype.links.apply(this, arguments);
    links.push({
      'label': loc('oie.verify.webauthn.cant.verify', 'login'),
      'name': 'cant-verify',
      'href': '#',
      'aria-expanded': false,
      'aria-controls': 'help-description-container',
      'class': 'link help js-help',
    });

    return links;
  },

  postRender: function() {
    this.$('.js-help-description').hide();
  },

  toggleLinks: function(e) {
    e.preventDefault();
    this.$('.js-help-description').slideToggle(200, () => {
      this.$('.js-help').attr('aria-expanded', this.$('.js-help-description').is(':visible'));
    });
  },
});

export default BaseAuthenticatorView.extend({
  Body,
  Footer,
  postRender() {
    BaseAuthenticatorView.prototype.postRender.apply(this, arguments);
    // Trigger browser prompt automatically for other browsers for better UX.
    if (webauthn.isNewApiAvailable() && !BrowserFeatures.isSafari()) {
      this.form.getCredentialsAndSave();
    }
  },
});
