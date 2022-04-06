import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import '/imports/ui_3/views/modals/modal.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Period } from '/imports/api/transactions/periods/period.js';
import { Periods } from '/imports/api/transactions/periods/periods.js';
import '/imports/api/transactions/periods/methods.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/components/ledger-report.js';
import '/imports/ui_3/views/components/partner-ledger-report.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/journals-table.js';
import '/imports/ui_3/views/components/journals-check.js';
import '/imports/ui_3/views/components/income-statement.js';
import './accounting-ledger.html';

Template.Accounting_ledger.viewmodel({
  periodBreakdown: undefined,
  periodSelected: Period.currentYearTag(),
  periodOrCumulation: 'period',
  showTechnicalAccounts: false,
  showPartnerLedger: false,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      this.periodBreakdown(Periods.findOne({ communityId })?.breakdown());
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
    this.periodBreakdown()?.nodes(false).forEach((tag) => {
      const year = tag.path[1];
      const yearLabel = tag.path.length === 3 ? year + ' ' : '';
      periodOptions.push({ label: yearLabel + __(tag.label || tag.name), value: tag.code });
    });
    return periodOptions;
  },
  closedAt() {
    return Periods.findOne({ communityId: this.communityId() })?.closedAt;
  },
  selectedPeriodIsOpen() {
    const period = Period.fromTag(this.periodSelected());
    return this.closedAt().getTime() < period.endDate().getTime();
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
  'click .js-close'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    const tag = instance.viewmodel.periodSelected();
    Modal.confirmAndCall(Periods.methods.close, { communityId, tag },
      { entity: 'period', action: 'close', message: 'Close period warning' });
  },
});
