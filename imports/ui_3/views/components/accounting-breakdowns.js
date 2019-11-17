/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { breakdownColumns } from '/imports/api/transactions/breakdowns/tables.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import '/imports/api/transactions/breakdowns/methods.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import '/imports/api/transactions/breakdowns/actions.js';
import '/imports/api/transactions/tx-cats/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/api/transactions/tx-cats/methods.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import './accounting-breakdowns.html';

Template.Accounting_breakdowns.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('breakdowns.inCommunity', { communityId });
      instance.subscribe('txCats.inCommunity', { communityId });
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  noBreakdownsDefined() {
    const communityId = Session.get('activeCommunityId');
    return Breakdowns.find({ communityId }).count() === 0;
  },
  txCats() {
    const communityId = Session.get('activeCommunityId');
    const txCats = TxCats.find({ communityId });
    return txCats;
  },
  breakdownsTableDataFn(tab) {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      if (tab === 'coa') return Breakdowns.find({ communityId, sign: { $exists: true } }).fetch();
      if (tab === 'loc') return Breakdowns.find({ communityId, name: { $in: ['Parcels', 'Places'] } }).fetch();
      if (tab === 'others') return Breakdowns.find({ communityId, sign: { $exists: false }, name: { $not: { $in: ['COA', 'Parcels', 'Places', 'Localizer'] } } }).fetch();
      return [];
    }
    return getTableData;
  },
  // Unfortunately since Blaze calls a function if possible, its difficult to hand back a function itself *without being called)
  // That is why we need different helpers - and not good to have one helper with a parameter
  coaBreakdownsTableDataFn() { return this.breakdownsTableDataFn('coa'); },
  locBreakdownsTableDataFn() { return this.breakdownsTableDataFn('loc'); },
  othersBreakdownsTableDataFn() { return this.breakdownsTableDataFn('others'); },
  //
  breakdownsOptionsFn() {
    return () => Object.create({
      columns: breakdownColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      paging: false,
      info: false,
    });
  },
  optionsOf(accountCode) {
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = Breakdowns.findOneByName('ChartOfAccounts', this.communityId());
    if (brk) return brk.nodeOptionsOf(accountCode, true);
    return [];
  },
});

Template.Accounting_breakdowns.events(
  actionHandlers(Breakdowns)
);

Template.Accounting_breakdowns.events(
  actionHandlers(TxCats)
);

Template.Accounting_breakdowns.events({
  'click #coa .js-clone'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    Transactions.methods.cloneAccountingTemplates.call({ communityId }, handleError);
  },
});
