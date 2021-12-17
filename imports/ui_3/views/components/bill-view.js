import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { Parcels } from '/imports/api/parcels/parcels';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { displayAccount, displayLocalizer } from '/imports/ui_3/helpers/api-display.js';
import '/imports/api/transactions/actions.js';

import './bill-view.html';

Template.Bill_view.viewmodel({
  showAccounting: true,
  onCreated(instance) {
    instance.subscribe('transactions.byId', { _id: this.templateInstance.data.doc._id });
  },
  reactiveDoc() {
    return Transactions.findOne(this.templateInstance.data.doc._id);
  },
  isBill() {
    return this.templateInstance.data.doc.category === 'bill';
  },
  showPayments() {
    if (!this.isBill()) return false;
    const doc = this.reactiveDoc();
    return doc.getPayments().length;
  },
  parcelRef(parcelId) {
    const parcel = Parcels.findOne(parcelId);
    return parcel && parcel.ref;
  },
  findTx(id) {
    return Transactions.findOne(id);
  },
  displayAccount(code, communityId) {
    if (!Meteor.user().hasPermission('transactions.inCommunity')) return '';
    return displayAccount(code, communityId);
  },
  displayLocalizer(code, communityId) {
    if (!Meteor.user().hasPermission('transactions.inCommunity')) return '';
    return displayLocalizer(code, communityId);
  },
});
