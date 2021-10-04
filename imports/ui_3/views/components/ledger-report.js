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
    const period = Period.fromTag(tag);
    let balance;
    if (tagtype === 'period' || period.type() === 'total') {
      balance = Balances.get({
        communityId: ModalStack.getVar('communityId'),
        account: account.code,
        tag,
      });
    } else if (tagtype === 'cumulation') {
      let date;
      if (period.type() === 'year') date = period.year + '-12-31';
      else if (period.type() === 'month') date = period.label + '-' + moment(period.label).daysInMonth();
      balance = Balances.getCumulatedValue({
        communityId: ModalStack.getVar('communityId'),
        account: account.code }, date);
    }
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
  displayPeriod(tag) {
    const node = PeriodBreakdown.nodeByCode(tag);
    return node.label || node.name;
  },
});
