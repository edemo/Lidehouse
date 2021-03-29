import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { Parcels } from '/imports/api/parcels/parcels';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';

import './bill-view.html';

Template.Bill_view.viewmodel({
  onCreated(instance) {
  },
  reactiveDoc() {
    return Transactions.findOne(this.templateInstance.data.doc._id);
  },
  isBill() {
    return this.templateInstance.data.doc.category === 'bill';
  },
  showPayments() {
    const doc = this.reactiveDoc();
    return doc.payments.length;
  },
  parcelRef(parcelId) {
    const parcel = Parcels.findOne(parcelId);
    return parcel && parcel.ref;
  },
  findTx(id) {
    return Transactions.findOne(id);
  },
});
