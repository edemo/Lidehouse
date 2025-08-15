import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { moment } from 'meteor/momentjs:moment';

import '/imports/ui_3/views/modals/modal.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { Period } from '/imports/api/accounting/periods/period.js';
import { AccountingPeriods } from '/imports/api/accounting/periods/accounting-periods.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/api/accounting/periods/methods.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/components/partner-ledger-report.js';
import '/imports/ui_3/views/components/partner-history.js';
import './accounting-partner-ledger.html';

Template.Accounting_partner_ledger.viewmodel({
  periodBreakdown: undefined,
  periodSelected: Period.currentYearTag(),
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
  relation() {
    return ModalStack.getVar('relation');
  },
  contracts() {
    return Contracts.find({ communityId: this.communityId(), relation: this.relation() }).fetch();
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
});

Template.Accounting_partner_ledger.events({
});
