import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';

import './bill-show.html';

Template.Bill_show.viewmodel({
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
  code2parcelRef(code) {
    return Localizer.code2parcelRef(code);
  },
  partnerRelation() {
    return Session.get('modalContext').txdef.data.relation;
  },
  isBill() {
    return Session.get('modalContext').txdef.category === 'bill';
  },
});
