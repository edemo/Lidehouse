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
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import '/imports/api/transactions/txdefs/methods.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';

import './accounting-breakdowns.html';


Template.Accounting_breakdowns.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('breakdowns.inCommunity', { communityId });
      instance.subscribe('txdefs.inCommunity', { communityId });
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  noBreakdownsDefined() {
    const communityId = Session.get('activeCommunityId');
    return Breakdowns.find({ communityId }).count() === 0;
  },
  txDefs() {
    const communityId = Session.get('activeCommunityId');
    const txdefs = TxDefs.find({ communityId });
    return txdefs;
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
    function getOptions() {
      return {
        columns: breakdownColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        paging: false,
        info: false,
      };
    }
    return getOptions;
  },
  optionsOf(accountCode) {
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = Breakdowns.findOneByName('ChartOfAccounts', this.communityId());
    if (brk) return brk.nodeOptionsOf(accountCode, true);
    return [];
  },
});

Template.Accounting_breakdowns.events({
  'click .breakdowns .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.insert',
      collection: Breakdowns,
      type: 'insert',
      //      type: 'method',
//      meteormethod: 'breakdowns.insert',
    });
  },
  'click .breakdowns .js-edit-na'(event) {
    const id = $(event.target).closest('button').data('id');
    const breakdown = Breakdowns.findOne(id);
    const modalContext = {
      title: 'Edit Breakdown',
      body: 'Nestable_edit',
      bodyContext: { json: breakdown },
      btnClose: 'cancel',
      btnOK: 'save',
      onOK() {
        const json = serializeNestable();
        // console.log('saving nestable:', JSON.stringify(json));
        // assert json.length === 1
        // assert json[0].name === breakdown.name
        // assert locked elements are still there 
        Breakdowns.update(id, { $set: { children: json[0].children } },
          onSuccess(res => displayMessage('success', 'Breakdown saved'))
        );
      },
    };
    Modal.show('Modal', modalContext);
  },
  'click .breakdowns .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.update',
      collection: Breakdowns,
      doc: Breakdowns.findOne(id),
      type: 'method-update',
      meteormethod: 'breakdowns.update',
      singleMethodArgument: true,
    });
  },
  'click .breakdowns .js-view'(event, instance) {
    const id = $(event.target).closest('button').data('id');
    const breakdown = Breakdowns.findOne(id);
    const modalContext = {
      title: 'View Breakdown',
      body: 'Nestable_edit',
      bodyContext: { json: breakdown, disabled: true },
    };
    Modal.show('Modal', modalContext);
  },
  'click .breakdowns .js-view-af'(event, instance) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.view',
      collection: Breakdowns,
      doc: Breakdowns.findOne(id),
      type: 'readonly',
    });
  },
  'click .breakdowns .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.confirmAndCall(Breakdowns.remove, { _id: id }, {
      action: 'delete breakdown',
    });
  },
  'click .txdefs .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.txDef.insert',
      collection: TxDefs,
      type: 'method',
      meteormethod: 'txDefs.insert',
    });
  },
  'click .txdefs .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.txDef.update',
      collection: TxDefs,
      doc: TxDefs.findOne(id),
      type: 'method-update',
      meteormethod: 'txDefs.update',
      singleMethodArgument: true,
    });
  },
  'click .txdefs .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.confirmAndCall(TxDefs.methods.remove, { _id: id }, {
      action: 'delete txDef',
    });
  },
  'click #coa .js-clone'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    Transactions.methods.cloneAccountingTemplates.call({ communityId }, handleError);
  },
});


AutoForm.addModalHooks('af.breakdown.insert');
AutoForm.addModalHooks('af.breakdown.update');
AutoForm.addHooks('af.breakdown.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addModalHooks('af.txDef.insert');
AutoForm.addModalHooks('af.txDef.update');
AutoForm.addHooks('af.txDef.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});