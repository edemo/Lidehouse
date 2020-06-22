import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ViewModel } from 'meteor/manuel:viewmodel';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/partners/actions.js';
import { partnersFinancesColumns } from '/imports/api/partners/tables.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/api/transactions/parcel-billings/actions.js';

import './accounting-filter.html';

ViewModel.share({
  accountingFilter: {
    txStatusSelected: [],
    unreconciledOnly: false,
    activePartnerRelation: 'supplier',  // only on bills page
    beginDate: '',
    endDate: '',
    partnerContractSelected: '',
    partnerContractOptions: [],
    localizerSelected: '',
    localizerOptions: [],
    autorun: [
      function subscription() {
        const communityId = this.communityId();
        const instance = this.templateInstance;
        instance.autorun(() => {
          if (this.unreconciledOnly()) {
            instance.subscribe('transactions.unreconciled', { communityId });
            instance.subscribe('transactions.outstanding', { communityId });
          } else {
            instance.subscribe('transactions.inCommunity', { communityId });
          }
        });
      },
      function filterOptions() {
        const communityId = this.communityId();
        this.localizerOptions(Parcels.nodeOptionsOf(communityId, ''));
        this.partnerContractOptions([{ label: __('All'), value: '' }].concat(Contracts.partnerContractOptions({ communityId })));
      },
    ],
    communityId() {
      return ModalStack.getVar('communityId');
    },
    transactionStatuses() {
      return Object.values(Transactions.statuses);
    },
    relationValues() {
      return Partners.relationValues;
    },
    activeButton(field, value) {
      const selected = this[`${field}Selected`]();
      return selected.includes(value) && 'active';
    },
    activeClass(partnerRelation) {
      return (this.activePartnerRelation() === partnerRelation) && 'active';
    },
    setDefaultFilter() {
      this.txStatusSelected(['draft', 'posted']);
      this.beginDate(moment().startOf('year').format('YYYY-MM-DD'));
      this.endDate(moment().format('YYYY-MM-DD'));
      this.unreconciledOnly(false);
      this.partnerContractSelected('');
      this.localizerSelected('');
    },
    hasFilters() {
      if (this.txStatusSelected()[0] !== 'draft' ||
          this.txStatusSelected()[1] !== 'posted' ||
          this.unreconciledOnly() !== false ||
          this.beginDate() !== moment().startOf('year').format('YYYY-MM-DD') ||
          this.endDate() !== moment().format('YYYY-MM-DD') ||
          this.partnerContractSelected() ||
          this.localizerSelected()) return true;
      return false;
    },
    subscribeSelector() {
      const communityId = this.communityId();
      const selector = { communityId };
      selector.relation = this.activePartnerRelation();
      if (this.txStatusSelected().length > 0) selector.status = { $in: this.txStatusSelected() };
      if (this.unreconciledOnly()) {
//        selector.outstanding = { $or: { $exists: false, $gte: 0 } };
        selector.seId = { $exists: false };
      }
      selector.valueDate = {};
      if (this.beginDate()) selector.valueDate.$gte = new Date(this.beginDate());
      if (this.endDate()) selector.valueDate.$lte = new Date(this.endDate());
      if (this.partnerContractSelected()) {
        const pc = this.partnerContractSelected().split('/');
        if (pc[0]) selector.partnerId = pc[0];
        if (pc[1]) selector.contractId = pc[1];
      }
      if (this.localizerSelected()) selector.localizer = '\\^' + this.localizerSelected() + '\\';
      return selector;
    },
    filterSelector(category) {
      const selector = this.subscribeSelector();
      selector.category = category;
      return selector;
    },
  },
});

Template.Accounting_filter.viewmodel({
  share: 'accountingFilter',
  onCreated(instance) {
    this.setDefaultFilter();
  },
});

Template.Accounting_filter.events({
  'click .js-relation-filter'(event, instance) {
    const partnerRelation = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activePartnerRelation(partnerRelation);
  },
  'click .js-filter'(event, instance) {
    const field = $(event.target).data('field');
    const value = $(event.target).data('value');
    const vmFunc = instance.viewmodel[`${field}Selected`];
    const selected = vmFunc();
    if (selected.includes(value)) {
      vmFunc(_.without(selected, value));
      $(event.target).blur();
    } else {
      selected.push(value);
      vmFunc(selected);
    }
  },
  'click .js-clear-filter'(event, instance) {
    instance.viewmodel.setDefaultFilter();
  },
});
