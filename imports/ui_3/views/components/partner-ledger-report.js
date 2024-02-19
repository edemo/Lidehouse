import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Period } from '/imports/api/transactions/periods/period.js';
import './partner-ledger-report.html';

Template.Partner_ledger_report.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = ModalStack.getVar('communityId');
      instance.subscribe('balances.inCommunity', { communityId, partners: [] /*, tags: [Template.currentData().tag]*/ });
    });
  },
  communityId() {
    return ModalStack.getVar('communityId');
  },
  community() {
    return Communities.findOne(this.communityId());
  },
  relationAccount() {
    // TODO: Get it from configuration
    const relation = this.templateInstance.data.relation;
    let accountCode;
    if (relation === 'member') accountCode = '`33';
    else if (relation === 'customer') accountCode = '`31';
    else if (relation === 'supplier') accountCode = '`454';
    else debugAssert(false);
    if (this.community()?.settings.accountingMethod === 'cash') accountCode = Accounts.toTechnicalCode(accountCode);
    return accountCode;
  },
  unidentifiedIncomeAccount() {
    return '`431'; // TODO: Get it from configuration
  },
  unidentifiedExpenseAccount() {
    return '`434'; // TODO: Get it from configuration
  },
  unidentifiedAccount() {
    const relation = this.templateInstance.data.relation;
    if (relation === 'supplier') return this.unidentifiedExpenseAccount();
    else return this.unidentifiedIncomeAccount();
  },
  balance(contract, account, tag, sideFunc, tagtype) {
    const balance = Balances.get({
      communityId: this.communityId(),
      account,
      partner: contract.code(),
      tag,
    }, tagtype);
    let result = balance[sideFunc]();
    if (sideFunc === 'total') result *= -1;
    return result;
  },
  hasActivity(contract, tag) {
    return !!Balances.findOne({
      communityId: this.communityId(),
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
