import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Clock } from '/imports/utils/clock';
import { __ } from '/imports/localization/i18n.js';
import '/imports/ui_3/views/modals/modal-guard.js';
// The autoform needs to see these, to handle new events on it
import '/imports/api/partners/actions.js';
import '/imports/api/contracts/actions.js';
import './bill-edit.html';

Template.Bill_edit.helpers({
  partnerRelation() {
    return this.doc.relation;
  },
  isBill() {
    return this.doc.category === 'bill';
  },
  defaultDate() {
    return Clock.currentTime();
  },
  defaultDueDate() {
    return moment().add(30, 'day').toDate();
  },
  notNullLine(afLine) {
    // Not the right place to find out if line is null (got removed earlier)
    // Should be dealt with within autoform iterator
    const index = afLine.name.split('.')[1];
//    console.log(AutoForm.getFieldValue('lines')[index]);
    return AutoForm.getFieldValue('lines')[index];
  },
  lineTotal(afLine) {
    function getLineField(fieldName) {
      return AutoForm.getFieldValue(afLine.name + '.' + fieldName) || 0;
    }
    let amount = getLineField('unitPrice') * getLineField('quantity');
    const tax = (amount * getLineField('taxPct') || 0) / 100;
    amount += tax;
    return amount || 0;
  },
  billTotal(which) {
    let net = 0;
    let tax = 0;
    let gross = 0;
    (AutoForm.getFieldValue('lines') || []).forEach(line => {
      if (!line) return;
      let lineAmount = line.unitPrice * line.quantity || 0;
      const lineTax = (lineAmount * line.taxPct || 0) / 100;
      net += lineAmount;
      tax += lineTax;
      lineAmount += lineTax;
      gross += lineAmount;
    });
    return { net, tax, gross }[which];
  },
});
