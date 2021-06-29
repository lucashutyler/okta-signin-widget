/*!
 * Copyright (c) 2020, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { View, $ } from 'okta';
import { BaseView } from '../internals';
import Link from './Link';

export default View.extend({
  initialize() {
    BaseView.prototype.initialize.apply(this, arguments);
    const textViewOptions = this.options.additionalOptions;
    const linkOptions = Object.assign({}, this.options,
      {
        'type': 'link',
        'aria-expanded': false,
        'clickHandler': function() {
          $(textViewOptions.selector).slideToggle(200, () => {
            $(textViewOptions.selector).attr('aria-expanded', false);
          });
        }
      });
    this.add(Link, { options: linkOptions });
    this.add(textViewOptions.view);
  }
});
