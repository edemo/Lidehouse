import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { numeral } from 'meteor/numeral:numeral';

import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import './balance-report.html';

Template.Balance_report.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('balances.ofAccounts', { communityId });
  });
});

Template.Balance_report.helpers({
  balance(account, tag) {
    return Balances.get({
      communityId: Session.get('activeCommunityId'),
      account: account.code,
      tag,
    }).displayTotal();
  },
  hasActivity(account) {
    return !!Balances.findOne({
      communityId: Session.get('activeCommunityId'),
      account: new RegExp('^' + account.code),
    });
  },
  headerLevelClass(account) {
    return 'header-level' + account.code.length.toString();
  },
  displayAccount(account) {
    return Breakdowns.display(account);
  },
  negativeClass(number) {
    return number < 0 && 'negative';
  },
  displayPeriod(tag) {
    const node = PeriodBreakdown.nodeByCode(tag);
    return node.label || node.name;
  },
});
