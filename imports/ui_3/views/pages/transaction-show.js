import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import '/imports/api/accounting/entities.js';
import '/imports/api/accounting/actions.js';
import '/imports/ui_3/views/components/bill-view.js';
import './transaction-show.html';

Template.Transaction_show.viewmodel({
  onCreated(instance) {
    instance.subscribe('transactions.byId', { _id: this.id() });
  },
  autorun() {
    const tx = this.doc();
    const communityId = tx && tx.communityId;
    if (communityId) {
      this.templateInstance.subscribe('txdefs.inCommunity', { communityId });
      this.templateInstance.subscribe('accounts.inCommunity', { communityId });
    }
  },
  id() {
    return FlowRouter.getParam('_txid');
  },
  context() {
    return { doc: this.doc() };
  },
  doc() {
    return Transactions.findOne(this.id());
  },
  viewForm() {
    const tx = this.doc();
    const entity = tx && Transactions.entities[tx.entityName()];
    return entity && entity.viewForm;
  },
  pageTitle() {
    const tx = this.doc();
    const txdef = tx && tx.txdef();
    return txdef && `${__(txdef.name)} ${__('details')}`;
  },
  smallTitle() {
    const tx = this.doc();
    return tx && tx.serialId;
  },
  pageCrumbs() {
    return [{
      title: __('Parcels finances'),
      url: FlowRouter.path('Parcels finances'),
    }];
  },
});
