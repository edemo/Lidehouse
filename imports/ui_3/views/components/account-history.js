import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { JournalEntries } from '/imports/api/journals/entries.js';
import './account-history.html';

Template.Account_history.viewmodel({
  startDate: '',
  endDate: '',
  account: '',
  accountOptions: '',
  status: 'Reconciled',
  onCreated() {
//    const today = moment().format('L');
//    this.endDate(today);
  },
  journalEntries() {
    let total = 0;
    const entries = JournalEntries.find({
      'account.Assets': 'Bank főszámla',
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
