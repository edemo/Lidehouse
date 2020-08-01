import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

import './income-statement.html';

Template.Income_statement.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('balances.ofAccounts', { communityId });
  });
});

Template.Income_statement.helpers({
});
