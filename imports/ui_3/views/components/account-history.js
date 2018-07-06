import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { JournalEntries } from '/imports/api/journals/entries.js';
//-----
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Memberships } from '/imports/api/memberships/memberships.js';

import './account-history.html';
import { AccountSpecification } from '../../../api/journals/account-specification';

Template.Account_history.viewmodel({
  startDate: '',
  endDate: '',
  accountSelected: '',
  accountOptions: [],
  status: 'Reconciled',
  onCreated() {
//    const today = moment().format('L');
//    this.endDate(today);
  },
  journalEntries() {
    const accountSpec = AccountSpecification.fromNames(this.accountSelected());
    const entries = JournalEntries.find({
      ['account.' + accountSpec.mainFamily]: accountSpec.mainLeaf,
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



Template.Parcel_history.viewmodel({
  startDate: '',
  endDate: '',
  localizerSelected: '',
  localizerOptions: '',
  onCreated() {
    const communityId = Session.get('activeCommunityId');
    const myParcelSerials = Memberships.find({ communityId, 'person.userId': Meteor.userId(), role: 'owner' }).map(m => m.parcel() ? m.parcel().serial : null);
    this.localizerOptions(myParcelSerials.map(ps => ps.toString()));
    if (myParcelSerials && myParcelSerials[0]) {
      this.localizerSelected(myParcelSerials[0].toString());
    }
//    const today = moment().format('L');
//    this.endDate(today);
  },
  journalEntries() {
    let total = 0;
    const entries = JournalEntries.find({
      'account.Owners': { $exists: true },
      'account.Localizer': this.localizerSelected(),
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
