import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import '/imports/ui_3/views/modals/modal.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Period, PeriodBreakdown } from '/imports/api/transactions/breakdowns/period';
import { Parcels } from '/imports/api/parcels/parcels';
import { Accounts } from '/imports/api/transactions/accounts/accounts';
import { Contracts } from '/imports/api/contracts/contracts';
import { Balances } from '/imports/api/transactions/balances/balances';
import '/imports/ui_3/views/components/ledger-report.js';
import '/imports/ui_3/views/components/partner-ledger-report.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/journals-table.js';
import '/imports/ui_3/views/components/journals-check.js';
import '/imports/ui_3/views/components/income-statement.js';
import './accounting-ledger.html';

Template.Accounting_ledger.viewmodel({
  periodSelected: PeriodBreakdown.currentYearTag(),
  periodOrCumulation: 'period',
  showTechnicalAccounts: false,
  showPartnerLedger: false,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('balances.inCommunity', { communityId });
      // Needed for the periodOptions. TODO: Ask the server what periods are available, so this sub is not needed
    });
  },
  communityId() {
    return getActiveCommunityId();
  },
  accounts() {
    return this.showTechnicalAccounts() ? Accounts.allWithTechnical(this.communityId()) : Accounts.all(this.communityId());
  },
  accountOptions() {
    return Accounts.coa(this.communityId()).nodeOptions();
  },
  localizerOptions() {
    return Parcels.nodeOptionsOf(this.communityId(), '');
  },
  partnerContractOptions() {
    return Contracts.partnerContractOptionsWithAll({ communityId: this.communityId });
  },
  contracts() {
    return Contracts.find({ communityId: this.communityId(), relation: 'member' }).fetch();
  },
  contractOptions() {
    return this.contracts().map(c => c.asOption());
  },
  totalTag() {
    return ['T'];
  },
  periodOptions() {
    const periodOptions = [];
    const currentYear = new Date().getFullYear();
    const oldestBalance = Balances.find({ communityId: this.communityId(), localizer: { $exists: false }, partner: { $exists: false },
      tag: new RegExp('^T-') }, { sort: { tag: 1 } }).fetch()[0];
    const oldestBalanceYear = oldestBalance ? Period.fromTag(oldestBalance.tag).year : currentYear;
    PeriodBreakdown.nodes(false).forEach((tag) => {
      const year = tag.path[1];
      if (year < oldestBalanceYear || year > currentYear) return;
      const yearLabel = tag.path.length === 3 ? year + ' ' : '';
      periodOptions.push({ label: yearLabel + __(tag.label || tag.name), value: tag.code });
    });
    return periodOptions;
  },
});

Template.Accounting_ledger.events({
  'change .periodRadio'(event, instance) {
    const selected = event.target.value;
    instance.viewmodel.periodOrCumulation(selected);
  },
  'click .js-partner-ledger'(event, instance) {
    const val = instance.viewmodel.showPartnerLedger();
    instance.viewmodel.showPartnerLedger(!val);
  },
  'click .js-journals'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    // ModalStack.setVar('parcelId', doc._id);
    Modal.show('Modal', {
      title: 'Full journal list',
      body: 'Journals_table',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
  'click .js-check-journals'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    Modal.show('Modal', {
      title: 'Journals check',
      body: 'Journals_check',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
  'click .js-income-statement'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    // ModalStack.setVar('parcelId', doc._id);
    Modal.show('Modal', {
      title: 'Income statement',
      body: 'Income_statement',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
});
