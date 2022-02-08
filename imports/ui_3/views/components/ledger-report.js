import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Period, PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import './ledger-report.html';

Template.Ledger_report.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('balances.ofAccounts', { communityId });
  });
});

Template.Ledger_report.helpers({
  balance(account, tag, sideFunc, tagtype) {
    const balance = Balances.get({
      communityId: ModalStack.getVar('communityId'),
      account: account.code,
      tag,
    }, tagtype);
    return balance[sideFunc]();
  },
  hasActivity(account) {
    return !!Balances.findOne({
      communityId: ModalStack.getVar('communityId'),
      account: new RegExp('^' + account.code),
    });
  },
  headerLevelClass(account) {
    return 'header-level' + (account.code.length - 1).toString();
  },
  displayAccount(account) {
    return account.displayAccount();
  },
});
