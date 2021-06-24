import AuthenticatorFooter from './AuthenticatorFooter';
import { $, _, loc, View } from 'okta';
import { getBackToSignInLink } from '../utils/LinksUtil';
import Link from './Link';
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

export default AuthenticatorFooter.extend({

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
  },

  links: function() {
    const links = AuthenticatorFooter.prototype.links.apply(this, arguments);
    links.push({
      'label': loc('oie.verify.webauthn.cant.verify', 'login'),
      'name': 'cant-verify',
      'aria-expanded': false,
      'aria-controls': 'help-description-container',
      'class': 'link help js-help',
      'clickHandler': function() {
        $('.js-help-description').slideToggle(200, () => {
          $('.js-help').attr('aria-expanded', $('.js-help-description').is(':visible'));
        });
      },
    });

    return links;
  },

  postRender: function() {
    this.$('.js-help-description').hide();
  },
});
