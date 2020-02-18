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
  //  const billId = FlowRouter.getParam('_bid');
    instance.subscribe('bills.byId', { _id: this.templateInstance.data.doc._id });
  //  this.docVm(instance.data.doc);
  },
  autorun() {
    this.docVm(Transactions.findOne(this.templateInstance.data.doc._id));
  },
//  bill() {
//    return Transactions.findOne(FlowRouter.getParam('_bid'));
//  },
  pageTitle() {
    return __('bill');
  },
  smallTitle() {
    return this.templateInstance.data.title;
  },
  pageCrumbs() {
    return [{
      title: __('Accounting'),
      url: FlowRouter.path('Accounting'),
    }];
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
  isBill() {
    return this.docVm() && this.docVm().category === 'bill';
  },
});
