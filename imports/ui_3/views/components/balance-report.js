import { Template } from 'meteor/templating';
import { numeral } from 'meteor/numeral:numeral';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import './balance-report.html';

Template.Balance_report.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('balances.ofAccounts', { communityId });
  });
});

Template.Balance_report.helpers({
  balance(account, tag) {
    return Balances.get({
      communityId: ModalStack.getVar('communityId'),
      account: account.code,
      tag,
    }).displayTotal();
  },
  hasActivity(account) {
    return !!Balances.findOne({
      communityId: ModalStack.getVar('communityId'),
      account: new RegExp('^' + account.code),
    });
  },
  headerLevelClass(account) {
    return 'header-level' + account.code.length.toString();
  },
  displayAccount(account) {
    return Breakdowns.display(account);
  },
  displayPeriod(tag) {
    const node = PeriodBreakdown.nodeByCode(tag);
    return node.label || node.name;
  },
});
