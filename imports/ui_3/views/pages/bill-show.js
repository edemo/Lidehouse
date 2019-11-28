import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import '/imports/api/transactions/bills/actions.js';

import './bill-show.html';

Template.Bill_show.viewmodel({
  docVm: undefined,
  onCreated(instance) {
  //  const billId = FlowRouter.getParam('_bid');
  //  this.subscribe('bills.byId', { _id: billId });
  //  this.docVm(instance.data.doc);
  },
  autorun() {
    this.docVm(Bills.findOne(this.templateInstance.data.doc._id));
  },
//  bill() {
//    return Bills.findOne(FlowRouter.getParam('_bid'));
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
    return Bills.actions;
  },
  code2parcelRef(code) {
    return Localizer.code2parcelRef(code);
  },
});
