import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { JournalEntries } from '/imports/api/journals/entries.js';
//-----
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AccountSpecification } from '/imports/api/journals/account-specification';
import './account-history.html';

Template.Account_history.viewmodel({
  startDate: '',
  endDate: '',
  accountSelected: '',
  accountOptions: [],
  localizerSelected: '',
  localizerOptions: [],
  status: 'Reconciled',
  onCreated() {
    const instance = Template.instance();
    instance.autorun(() => {
      if (this.accountOptions().length && !this.accountSelected()) {
        this.accountSelected(this.accountOptions()[0].value);
      }
      if (this.localizerOptions().length && !this.localizerSelected()) {
        this.localizerSelected(this.localizerOptions()[0].value);
      }
    });
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
//      console.log('subscribing:', communityId, this.accountSelected(), this.localizerSelected());
      instance.subscribe('journals.byAccount', {
        communityId,
        account: this.accountSelected(),
        localizer: this.localizerSelected(),
      });
    });
//    const today = moment().format('L');
//    this.endDate(today);
  },
  journalEntries() {
//    const accountSpec = new AccountSpecification(this.accountSelected());
    const selector = { valueDate: { $gte: new Date(this.startDate()), $lte: new Date(this.endDate()) } };
    if (this.accountSelected()) selector.account = this.accountSelected();
    if (this.localizerSelected()) selector.localizer = this.localizerSelected();
//    console.log('data fetching:', selector);
    const entries = JournalEntries.find(selector, { sort: { valueDate: 1 } }).fetch();
    let total = 0;
    const entriesWithRunningTotal = entries.map(e => {
      total += e.effectiveAmount();
      return _.extend(e, { total });
    });
    return entriesWithRunningTotal;
  },
  negativeClass(entry) {
    return entry.effectiveAmount() < 0 ? 'negative' : '';
  },
});
