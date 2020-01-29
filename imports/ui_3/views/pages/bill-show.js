import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';
import '/imports/ui_3/views/components/bill-view.js';
import './bill-show.html';

Template.Bill_show.viewmodel({
  onCreated(instance) {
  },
  autorun() {
  },
  bill() {
    return Transactions.findOne(FlowRouter.getParam('_bid'));
  },
  doc() {
    return { _id: FlowRouter.getParam('_bid') };
  },
  pageTitle() {
    return __('bill');
  },
  smallTitle() {
    const bill = this.bill();
    return bill && bill.serialId;
  },
  pageCrumbs() {
    return [{
      title: __('Accounting'),
      url: FlowRouter.path('Accounting'),
    }];
  },
});
