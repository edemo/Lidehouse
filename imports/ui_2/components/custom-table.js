import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { Session } from 'meteor/session';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { __ } from '/imports/localization/i18n.js';
import { _ } from 'meteor/underscore';
import { descartesProduct } from '/imports/utils/descartes.js';
import './custom-table.html';

Template.Custom_table.onCreated(function financesOnCreated() {
});

Template.Custom_table.helpers({
  timestamp() {
    return moment().format('YYYY.MM.DD');
  },
});

