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
  docVm: {},
  onCreated(instance) {
  //  const billId = FlowRouter.getParam('_bid');
  //  this.subscribe('bills.byId', { _id: billId });
    this.docVm(instance.data.doc);
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

function runInNewModal(toRun) {
  Meteor.setTimeout(toRun, 1000);
  Modal.hide();
}

Template.Bill_show.events({
  'click .js-edit'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    runInNewModal(() => Bills.actions.edit.run(id));
  },
  'click .js-post'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    runInNewModal(() => Bills.actions.post.run(id));
  },
  'click .js-payment'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    runInNewModal(() => Bills.actions.registerPayment.run(id));
  },
});
