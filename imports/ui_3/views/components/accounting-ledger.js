import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';

import '/imports/ui_3/views/modals/modal.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { ensureAllCorrect } from '/imports/api/accounting/balances/methods.js';
import { Period } from '/imports/api/accounting/periods/period.js';
import { AccountingPeriods } from '/imports/api/accounting/periods/accounting-periods.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import '/imports/api/accounting/periods/methods.js';
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
  showOpeningOnly: false,
  showTrafficOnly: false,
  showTechnicalAccounts: false,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      this.periodBreakdown(AccountingPeriods.findOne({ communityId })?.breakdown());
    });
  },
  communityId() {
    return getActiveCommunityId();
  },
  community() {
    return Communities.findOne(this.communityId());
  },
  accounts() {
    return this.showTechnicalAccounts() ? Accounts.allWithTechnical(this.communityId()) : Accounts.all(this.communityId());
  },
  tagtypeSelected() {
    if (this.showTrafficOnly()) {
      if (this.showOpeningOnly()) return 'C';
      else return 'T';
    } else {
      if (this.showOpeningOnly()) return 'O';
      else return 'C';
    }
  },
  accountOptions() {
    const communityId = this.communityId();
    return Accounts.coa(communityId).nodeOptions(communityId);
  },
  localizerOptions() {
    return Parcels.nodeOptionsOf(this.communityId(), '');
  },
  partnerContractOptions() {
    return Contracts.partnerContractOptionsWithAll({ communityId: this.communityId });
  },
  contracts(relation) {
    return Contracts.find({ communityId: this.communityId(), relation }).fetch();
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
  accountingClosedAt() {
    return AccountingPeriods.findOne({ communityId: this.communityId() })?.accountingClosedAt;
  },
  selectedPeriodIsOpen() {
    const period = Period.fromTag(this.periodSelected());
    return moment.utc(this.accountingClosedAt() || 0).valueOf() < moment.utc(period.end()).valueOf();
  },
});

Template.Accounting_ledger.events({
  'click .js-journals'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    // ModalStack.setVar('parcelId', doc._id);
    Modal.show('Modal', {
      id: 'journals.view',
      title: 'Full journal list',
      body: 'Journals_table',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
  'click .js-check-journals'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    Modal.show('Modal', {
      id: 'journals.check',
      title: 'Journals check',
      body: 'Journals_check',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
  'click .js-fix-balances'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    Modal.confirmAndCall(ensureAllCorrect, { communityId },
      { entity: 'balance', action: 'edit', message: 'It recalculates all balances, which takes a long long time!' });
  },
  'click .js-income-statement'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    // ModalStack.setVar('parcelId', doc._id);
    Modal.show('Modal', {
      id: 'incomestatement.view',
      title: 'Income statement',
      body: 'Income_statement',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
  'click .js-close'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    const tag = instance.viewmodel.periodSelected();
    Modal.confirmAndCall(AccountingPeriods.methods.close, { communityId, tag },
      { entity: 'period', action: 'close', message: 'Close period warning' });
  },
  'click .js-open'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    const tag = instance.viewmodel.periodSelected();
    Modal.confirmAndCall(AccountingPeriods.methods.open, { communityId, tag },
      { entity: 'period', action: 'open', message: 'Open period warning' });
  },
  'click .js-import'(event, instance) {
    importCollectionFromFile(Balances);
  },
});
