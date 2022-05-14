import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/ui_3/views/modals/modal.js';
import './text-input.html';

Template.Text_input.viewmodel({
  schema() {
    const schema = new SimpleSchema({
      text: { type: String, max: 50 },
    });
    schema.i18n('schemaText');
    return schema;
  },
});
