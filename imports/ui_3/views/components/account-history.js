import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { JournalEntries } from '/imports/api/transactions/entries.js';
//-----
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AccountSpecification } from '/imports/api/transactions/account-specification';
import './account-history.html';

Template.Account_history.viewmodel({
  sign: +1,
  beginDate: '',
  endDate: '',
  accountSelected: '',
  accountOptions: [],
  localizerSelected: '',
  localizerOptions: [],
  status: 'Reconciled',
  onCreated(instance) {
    const self = this;
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
//      console.log('subscribing:', communityId, this.accountSelected(), this.localizerSelected());
      instance.subscribe('transactions.byAccount', {
        communityId,
        account: self.accountSelected(),
        localizer: self.localizerSelected(),
        begin: moment(self.beginDate()).toDate(),
        end: moment(self.endDate()).add(1, 'day').toDate(),
      });
//    const today = moment().format('L');
//    this.endDate(today);
    });
  },
  autorun: [
    function defaultOptionSelect() {
      const instance = this.templateInstance;
      instance.autorun(() => {
        if (this.accountOptions().length && !this.accountSelected()) {
          this.accountSelected(this.accountOptions()[0].value);
        }
        if (this.localizerOptions().length && !this.localizerSelected()) {
          this.localizerSelected(this.localizerOptions()[0].value);
        }
      });
    },
  ],
  journalEntries() {
//    const accountSpec = new AccountSpecification(this.accountSelected());
    const selector = { valueDate: { $gte: moment(this.beginDate()).toDate(), $lt: moment(this.endDate()).add(1, 'day').toDate() } };
    if (this.accountSelected()) selector.account = this.accountSelected();
    if (this.localizerSelected()) selector.localizer = this.localizerSelected();
//    console.log('data fetching:', selector);
    const entries = JournalEntries.find(selector, { sort: { valueDate: 1 } });
    let total = 0;
    const entriesWithRunningTotal = entries.map(e => {
      total += e.effectiveAmount(this.sign());
      return _.extend(e, { total });
    });
    return entriesWithRunningTotal;
  },
  negativeClass(entry) {
    return entry.effectiveAmount(this.sign()) < 0 ? 'negative' : '';
  },
});
