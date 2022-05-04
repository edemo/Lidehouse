import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Period } from '/imports/api/transactions/periods/period.js';
import './partner-ledger-report.html';

Template.Partner_ledger_report.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('balances.inCommunity', { communityId, partners: [], tags: [Template.currentData().tag] });
  });
});

Template.Partner_ledger_report.helpers({
  balance(contract, tag, sideFunc, tagtype) {
    const balance = Balances.get({
      communityId: ModalStack.getVar('communityId'),
      partner: contract.code(),
      tag,
    }, tagtype);
    let result = balance[sideFunc]();
    if (sideFunc === 'total') result *= -1;
    return result;
  },
  hasActivity(contract, tag) {
    return !!Balances.findOne({
      communityId: ModalStack.getVar('communityId'),
      partner: new RegExp('^' + contract.code()),
      tag,
    });
  },
});

Template.Partner_ledger_report.events({
  'click .cell,.row-header'(event, instance) {
    const pageInstance = instance.parent(1);
    const communityId = pageInstance.viewmodel.communityId();
    if (!Meteor.user().hasPermission('transactions.inCommunity', { communityId })) return;
    const contractId = $(event.target).closest('[data-contract]').data('contract');
    const periodTag = $(event.target).closest('[data-tag]').data('tag');
    const period = Period.fromTag(periodTag);
    Modal.show('Modal', {
      id: 'partnerhistory.view',
      title: __('Partner history'),
      body: 'Partner_history',
      bodyContext: {
        beginDate: period.begin(),
        endDate: period.end(),
        partnerOptions: pageInstance.viewmodel.contractOptions(),
        partnerSelected: contractId,
      },
      size: 'lg',
    });
  },
});
