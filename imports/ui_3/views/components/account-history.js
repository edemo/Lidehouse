import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { validDateOrUndefined } from '/imports/api/utils';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import './account-history.html';

Template.Account_history.viewmodel({
  sign: +1,
  beginDate: undefined,
  endDate: undefined,
  accountSelected: undefined,
  accountOptions: [],
  localizerSelected: undefined,
  localizerOptions: [],
  partnerContractSelected: undefined,
  partnerContractOptions: [],
  status: 'Reconciled',
  onCreated(instance) {
    const self = this;
    instance.autorun(() => {
      const communityId = ModalStack.getVar('communityId');
      instance.subscribe('transactions.byAccount', this.subscribeParams());
      instance.subscribe('txdefs.inCommunity', { communityId });
      instance.subscribe('balances.inCommunity', this.subscribeParamsForBalance());
//    const today = moment().format('L');
//    this.endDate(today);
    });
  },
  autorun: [
    function defaultOptionSelect() {
      if (this.accountOptions().length && !this.accountSelected()) {
        this.accountSelected(this.accountOptions()[0].value);
      }
//      if (this.localizerOptions().length && !this.localizerSelected()) {
//        this.localizerSelected(this.localizerOptions()[0].value);
//      }
    },
    function enforceWholeYear() {
      const beginDate = moment(this.beginDate());
      const wholeBeginDate = moment(this.beginDate()).startOf('year');
      if (!beginDate.isSame(wholeBeginDate)) {
        this.beginDate(wholeBeginDate.format('YYYY-MM-DD'));
      }
    },
  ],
  subscribeParams() {
    const communityId = ModalStack.getVar('communityId');
    const selector = {
      communityId,
      begin: validDateOrUndefined(this.beginDate()),
      end: validDateOrUndefined(this.endDate()),
      account: this.accountSelected(),
      localizer: this.localizerSelected(),
      partner: this.partnerContractSelected(),
    };
    return selector;
  },
  openingBalanceTag() {
    return `O-${validDateOrUndefined(this.beginDate())?.getFullYear()}`;
  },
  subscribeParamsForBalance() {
    const params = _.extend(this.subscribeParams(), {  tag: this.openingBalanceTag() });
    delete params.begin;
    delete params.end;
    return params;
  },
  journalEntries() {
    const selector = JournalEntries.makeFilterSelector(this.subscribeParams());
    const entries = JournalEntries.find(selector, { sort: { valueDate: 1 } }).fetch();
    const balanceSelector = this.subscribeParamsForBalance();
    const openingBal = Balances.get(balanceSelector);
    const openingJe = openingBal.toJournalEntry();
//    console.log('openingBal', openingBal);
//    console.log('all Bals', Balances.find({ tag: this.openingBalanceTag() }).fetch());
    entries.unshift(openingJe);
    let total = 0;
    const entriesWithRunningTotal = entries.map(e => {
      total += e.effectiveAmount(this.sign());
      return _.extend(e, {
        total,
        debitTotal() { return this.total > 0 ? this.total : 0; },
        creditTotal() { return this.total < 0 ? (-1 * this.total) : 0; },
      });
    });
    return entriesWithRunningTotal.reverse();
  },
  negativeClass(entry) {
    return entry.effectiveAmount(this.sign()) < 0 ? 'negative' : '';
  },
});
