import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';

import './payment-view.html';

Template.Payment_view.viewmodel({
  docVm: undefined,
  onCreated(instance) {
  },
  autorun() {
    this.docVm(Transactions.findOne(this.templateInstance.data.doc._id));
  },
  actions() {
    return Transactions.actions;
  },
  parcelRef(parcelId) {
    return Parcels.findOne(parcelId).ref;
  },
  partnerRelation() {
    return this.docVm() && this.docVm().relation;
  },
  isPayment() {
    return this.docVm() && this.docVm().category === 'payment';
  },
  displayBill(bp) {
    const bill = Transactions.findOne(bp.id);
    return bill && bill.serialId;
  },
});
