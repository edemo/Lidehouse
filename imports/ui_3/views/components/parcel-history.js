import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { JournalEntries } from '/imports/api/transactions/entries.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
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
      if (this.partnerSelected()) {
        instance.subscribe('transactions.byPartner', {
          communityId: this.communityId(),
          partnerId: this.partnerSelected(),
          begin: moment(self.beginDate()).toDate(),
          end: moment(self.endDate()).add(1, 'day').toDate(),
        });
      }
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
  communityId() {
    return Session.get('activeCommunityId');
  },
  partnerSelected() {
    const parcel = Parcels.findOne(this.parcelSelected());
    const result = (parcel && parcel.payer()) ? parcel.payer()._id : undefined;
    return result;
  },
  transactions() {
    const selector = { valueDate: { $gte: moment(this.beginDate()).toDate(), $lt: moment(this.endDate()).add(1, 'day').toDate() } };
    if (this.partnerSelected()) selector.partnerId = this.partnerSelected();
    const txs = Transactions.find(selector, { sort: { valueDate: 1 } });
    let total = 0;
    const txsWithRunningTotal = txs.map(tx => {
      total += tx.subjectiveAmount();
      return _.extend(tx, { total });
    });
    return txsWithRunningTotal;
  },
  negativeClass(tx) {
    return tx.subjectiveAmount() < 0 ? 'negative' : '';
  },
  displayDataType(tx) {
    const dataType = tx.dataType;
    const typeName = dataType.substring(0, dataType.length - 1);
    const doc = tx.dataDoc();
    return __(typeName) + (doc.lineCount() ? ` (${doc.lineCount()} ${__('item')})` : '');
  },
});
