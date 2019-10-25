import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { JournalEntries } from '/imports/api/transactions/entries.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import './parcel-history.html';

Template.Parcel_history.viewmodel({
  beginDate: '',
  endDate: '',
  parcelOptions: [],
  parcelSelected: '',
  status: 'Reconciled',
  onCreated(instance) {
    const self = this;
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
//      console.log('subscribing:', communityId, this.accountSelected(), this.localizerSelected());
      instance.subscribe('transactions.byPartner', {
        communityId,
        partner: self.parcelSelected(),
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
        if (this.parcelOptions().length && !this.parcelSelected()) {
          this.parcelSelected(this.parcelOptions()[0].value);
        }
      });
    },
  ],
  transactions() {
    const selector = { valueDate: { $gte: moment(this.beginDate()).toDate(), $lt: moment(this.endDate()).add(1, 'day').toDate() } };
    if (this.parcelSelected()) selector.partner = this.parcelSelected();
    const txs = Transactions.find(selector, { sort: { valueDate: 1 } });
    let total = 0;
    const txsWithRunningTotal = txs.map(tx => {
      total += tx.effectiveAmount();
      return _.extend(tx, { total });
    });
    return txsWithRunningTotal;
  },
  negativeClass(tx) {
    return tx.effectiveAmount() < 0 ? 'negative' : '';
  },
});
