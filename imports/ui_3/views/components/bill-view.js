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

import './bill-view.html';

Template.Bill_view.viewmodel({
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
    const parcel = Parcels.findOne(parcelId);
    return parcel && parcel.ref;
  },
  partnerRelation() {
    return this.docVm() && this.docVm().relation;
  },
  isBill() {
    return this.docVm() && this.docVm().category === 'bill';
  },
});
