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
  status: 'Reconciled',
  onCreated() {
    const instance = Template.instance();
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('journals.byAccount', { communityId, account: this.accountSelected() });
    });
//    const today = moment().format('L');
//    this.endDate(today);
  },
  journalEntries() {
    const accountSpec = new AccountSpecification(this.accountSelected());
    const entries = JournalEntries.find({
      account: this.accountSelected(),
      valueDate: { $gte: new Date(this.startDate()), $lte: new Date(this.endDate()) },
    }, { sort: { valueDate: 1 } }).fetch();
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

//------------------------------------------

Template.Parcel_history.viewmodel({
  startDate: '',
  endDate: '',
  localizerSelected: '',
  localizerOptions: '',
  onCreated() {
    const communityId = Session.get('activeCommunityId');
    const myParcelRefs = Memberships.find({ communityId, personId: Meteor.userId(), role: 'owner' }).map(m => m.parcel() ? m.parcel().ref : null);
    this.localizerOptions(myParcelRefs);
    if (myParcelRefs && myParcelRefs[0]) {
      this.localizerSelected(myParcelRefs[0]);
    }
//    const today = moment().format('L');
//    this.endDate(today);
  },
  journalEntries() {
    let total = 0;
    const entries = JournalEntries.find({
//      account: { $startsWith: '3' }, // Liabilities
      localizer: this.localizerSelected(),
      valueDate: { $gte: new Date(this.startDate()), $lte: new Date(this.endDate()) },
    }, { sort: { valueDate: 1 } }).fetch();
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
