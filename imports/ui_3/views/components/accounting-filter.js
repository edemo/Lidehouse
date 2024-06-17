import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ViewModel } from 'meteor/manuel:viewmodel';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { defaultBeginDate, defaultEndDate } from '/imports/ui_3/helpers/utils.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert } from '/imports/utils/assert.js';
import { toggle, validDateOrUndefined } from '/imports/api/utils';
import { Relations } from '/imports/api/core/relations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/partners/actions.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/ui_3/views/blocks/help-icon.js';
import '/imports/api/transactions/parcel-billings/actions.js';

import './accounting-filter.html';

ViewModel.share({
  accountingFilter: {
    txStatusSelected: [],
    unreconciledOnly: true,
    activePartnerRelation: 'supplier',  // only on bills page
    beginDate: 'loadingValue', // do not subscribe until date filter is ready
    endDate: '',
    partnerContractSelected: '',
    partnerContractOptions: [],
    localizerSelected: '',
    localizerOptions: [],
    autorun() {
      const communityId = this.communityId();
      this.localizerOptions(Parcels.nodeOptionsOf(communityId, ''));
      const partnerContractSelector = { communityId, relation: ModalStack.getVar('relation') };
      this.partnerContractOptions(Contracts.partnerContractOptionsWithAll(partnerContractSelector));
    },
    transactionsSubscriptionParams() {
      return (this.beginDate() !== 'loadingValue') && {
        communityId: this.communityId(),
        begin: validDateOrUndefined(this.beginDate()),
        end: validDateOrUndefined(this.endDate()),
      };
    },
    communityId() {
      return ModalStack.getVar('communityId');
    },
    community() {
      return Communities.findOne(this.communityId());
    },
    transactionStatuses() {
      return Object.values(Transactions.statuses);
    },
    relationValues() {
      return Relations.values;
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
      this.beginDate(defaultBeginDate());
      this.endDate(defaultEndDate());
      this.unreconciledOnly(true);
      this.partnerContractSelected('');
      this.localizerSelected('');
    },
    hasFilters() {
      if (this.txStatusSelected()[0] !== 'draft' ||
          this.txStatusSelected()[1] !== 'posted' ||
          this.unreconciledOnly() !== true ||
          this.beginDate() !== defaultBeginDate() ||
          this.endDate() !== defaultEndDate() ||
          this.partnerContractSelected() ||
          this.localizerSelected()) return true;
      return false;
    },
    filterSelector(category) {
      const communityId = this.communityId();
      const selector = {
        communityId,
        category,
        begin: validDateOrUndefined(this.beginDate()),
        end: validDateOrUndefined(this.endDate()),
        partner: this.partnerContractSelected(),
        relation: this.activePartnerRelation(),
        localizer: this.localizerSelected(),
        $and: [],
      };
      if (this.txStatusSelected().length > 0) selector.status = { $in: this.txStatusSelected() };
      if (this.unreconciledOnly()) {
        if (category === 'bill') selector.outstanding = { $ne: 0 };
        else if (category === 'receipt') selector.reconciled = false;
        else if (category === 'payment') selector.reconciled = false;
      }
      return Transactions.makeFilterSelector(selector);
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
    ModalStack.setVar('relation', partnerRelation, true);
  },
  'click .js-toggle-filter'(event, instance) {
    const field = $(event.target).data('field');
    const value = $(event.target).data('value');
    const vmFunc = instance.viewmodel[`${field}Selected`];
    const selected = vmFunc();
    const newSelected = toggle(value, selected);
    vmFunc(newSelected);
    $(event.target).blur();  // if focus is on the button it appears to be pushed
  },
  'click .js-clear-filter'(event, instance) {
    instance.viewmodel.setDefaultFilter();
  },
});
