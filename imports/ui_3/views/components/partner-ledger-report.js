import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Period, PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import './partner-ledger-report.html';

Template.Partner_ledger_report.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('balances.ofAccounts', { communityId });
  });
});

Template.Partner_ledger_report.helpers({
  balance(contract, tag, sideFunc, tagtype) {
    const balance = Balances.get({
      communityId: ModalStack.getVar('communityId'),
      partner: contract.partnerContract(),
      tag,
    }, tagtype);
    return balance[sideFunc]();
  },
  hasActivity(contract) {
    return !!Balances.findOne({
      communityId: ModalStack.getVar('communityId'),
      partner: new RegExp('^' + contract.partnerContract()),
    });
  },
});
