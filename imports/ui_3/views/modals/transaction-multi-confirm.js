import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';

import '/imports/ui_3/views/components/transaction-view.html';
import './transaction-multi-confirm.html';

Template.Transaction_multi_confirm.viewmodel({
  onCreated(instance) {
  },
});
