import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { Period } from '/imports/api/accounting/periods/period.js';
import './ledger-report.html';

/*
Template.Ledger_report.viewmodel({
  tag: undefined,
  tagType: undefined,
  accounts: [],
  onCreated(instance) {
  },
  autorun: [
    function subscribe() {
      const communityId = ModalStack.getVar('communityId');
      const tags =  [this.tag()];
      console.log(' this.tagType()',  this.tagType());
      if (this.tagType() === 'C') {
        tags.push('O' + this.tag().substring(1, 6), 'C' + this.tag().substr(1, 6));
      }
      console.log('tags', tags);
      this.templateInstance.subscribe('balances.inCommunity', { communityId, tags });
    },
  ],
*/

Template.Ledger_report.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    const tag =  'C' + Template.currentData().tag.substring(1);
    this.subscribe('balances.inCommunity', { communityId, tag });
  });
});

Template.Ledger_report.helpers({
  getBalance(account, tag, tagtype) {
    const balance = Balances.get({
      communityId: ModalStack.getVar('communityId'),
      account: account.code,
      tag,
    }, tagtype);
    return balance;
  },
  hasActivity(account) {
    return !!Balances.findOne({
      communityId: ModalStack.getVar('communityId'),
      account: new RegExp('^' + account.code),
    });
  },
  headerLevelClass(account) {
    return 'header-level' + (account.code.length - 1).toString();
  },
  displayAccount(account) {
    return account.displayFull();
  },
});

Template.Ledger_report.events({
  'click .cell,.row-header'(event, instance) {
    const pageInstance = instance.parent(1);
    const communityId = pageInstance.viewmodel.communityId();
    if (!Meteor.user().hasPermission('transactions.inCommunity', { communityId })) return;
    const accountCode = $(event.target).closest('[data-account]').data('account');
    const periodTag = $(event.target).closest('[data-tag]').attr('data-tag');
    const period = Period.fromTag(periodTag);
    Modal.show('Modal', {
      id: 'accounthistory.view',
      title: __('Account history'),
      body: 'Account_history',
      bodyContext: {
        beginDate: period.begin(),
        endDate: period.end(),
        accountOptions: pageInstance.viewmodel.accountOptions(),
        accountSelected: '' + accountCode,
        localizerOptions: pageInstance.viewmodel.localizerOptions(),
        partnerContractOptions: pageInstance.viewmodel.partnerContractOptions(),
      },
      size: 'lg',
    });
  },
});
