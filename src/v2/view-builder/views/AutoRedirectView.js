import { loc } from 'okta';
import { BaseForm, BaseView } from '../internals';

const Body = BaseForm.extend({
  title() {
    return loc('oie.success.text.signingIn.with.fastpass', 'login');
  },

  noButtonBar: true,
  initialize() {
    BaseForm.prototype.initialize.apply(this, arguments);

    this.model.set('useRedirect', true);
    this.trigger('save', this.model);
  },

  render() {
    BaseForm.prototype.render.apply(this, arguments);
    this.add('<div class="okta-waiting-spinner"></div>');
  }
});

export default BaseView.extend({
  Body
});
