import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Period, PeriodBreakdown } from '/imports/api/transactions/breakdowns/breakdowns-utils';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import '/imports/ui_3/views/components/account-history.js';
import './accounting-ledger.html';

Template.Accounting_ledger.viewmodel({
  periodSelected: PeriodBreakdown.lastYearTag(),
  selectedAccount: '', // '382',
  selectedBeginDate: '', // '2018-01-01',
  selectedEndDate: '', // '2018-12-31',
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('breakdowns.inCommunity', { communityId: this.communityId() });
      instance.subscribe('balances.ofAccounts', { communityId: this.communityId() });
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  breakdown(name) {
    return Breakdowns.findOneByName(name, Session.get('activeCommunityId'));
  },
  totalTag() {
    return ['T'];
  },
  yearMonthTags() {
//    return PeriodBreakdown.currentYearMonths().concat('T');
    return PeriodBreakdown.nodesOf(this.periodSelected()).map(l => l.code);
  },
  accountOptions() {
    const brk = ChartOfAccounts.get();
    if (brk) return brk.nodeOptions(false);
    return [];
  },
  periodOptions() {
    return PeriodBreakdown.nodeOptions(false);
  },
});

Template.Accounting_ledger.events({
  'click .cell'(event, instance) {
    const accountCode = $(event.target).closest('[data-account]').data('account');
    instance.viewmodel.selectedAccount('' + accountCode);
    const periodTag = $(event.target).closest('[data-tag]').data('tag');
    const period = new Period(periodTag);
    instance.viewmodel.selectedBeginDate(period.begin());
    instance.viewmodel.selectedEndDate(period.end());
  },
  'click .js-reset'(event, instance) {
    instance.viewmodel.selectedAccount('');
  },
});
