/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import { __ } from '/imports/localization/i18n.js';

import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { PeriodBreakdown } from '/imports/api/journals/breakdowns/breakdowns-utils.js';
import { journalColumns } from '/imports/api/journals/tables.js';
import { breakdownColumns } from '/imports/api/journals/breakdowns/tables.js';
import { Reports } from '/imports/api/journals/reports/reports.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Journals } from '/imports/api/journals/journals.js';
import { insert as insertTx, remove as removeTx } from '/imports/api/journals/methods.js';
import { TxDefRegistry } from '/imports/api/journals/txdefs/txdef-registry.js';
import { ParcelBillings } from '/imports/api/journals/batches/parcel-billings.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
import { AccountSpecification } from '/imports/api/journals/account-specification';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/components/account-history.js';
import './accounting.html';

Template.Accounting.onCreated(function accountingOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('breakdowns.inCommunity', { communityId });
    this.subscribe('journals.incomplete', { communityId });
//    this.subscribe('txs.inCommunity', { communityId });
//    this.subscribe('txDefs.inCommunity', { communityId });
  });
});

Template.Accounting.onRendered(function accountingOnRendered() {
});

Template.Accounting.helpers({
  report(name, year) {
    if (!Template.instance().subscriptionsReady()) return Reports['Blank']();
    return Reports[name](year);
  },
  txDefs() {
/*    const txDefs = [
      { _id: '1', name: 'Payin' },
      { _id: '2', name: 'Obligation' }, 
      { _id: '3', name: 'Income' },
      { _id: '4', name: 'Expense'},
      { _id: '5', name: 'Backoffice op'},
    ];
    */
//    const communityId = Session.get('activeCommunityId');
//    const txDefs = TxDefs.find({ communityId });
    return TxDefRegistry;
  },
  mainBreakdownsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Breakdowns.find({ communityId: { $exists: false }, sign: { $exists: true } }).fetch();
    }
    return getTableData;
  },
  otherBreakdownsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Breakdowns.find({ communityId, sign: { $exists: false } }).fetch();
    }
    return getTableData;
  },
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
    const communityId = Session.get('activeCommunityId');
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = Breakdowns.findOneByName('ChartOfAccounts', communityId);
    if (brk) return brk.leafOptions(accountCode);
    return [];
  },
  journalsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Journals.find({ communityId, phase: 'done', complete: false }).fetch();
    }
    return getTableData;
  },
  journalsOptionsFn() {
    function getOptions() {
      return {
        columns: journalColumns({ view: true, edit: true, delete: true }),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
  afCommunityFinancesData() {
    const communityId = Session.get('activeCommunityId');
    const financesOnlySchema = Communities.simpleSchema().pick(['finances', 'finances.ccArea', 'finances.ccVolume', 'finances.ccHabitants']);
    return {
      id: 'af.communities.finances',
      collection: Communities,
      schema: financesOnlySchema,
      doc: Communities.findOne(communityId),
      type: 'method-update',
      meteormethod: 'communities.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    };
  },
});

function newParcelBillingSchema() {
  function chooseAccountsSchema() {
    const obj = {};
    const communityId = Session.get('activeCommunityId');
    const breakdown1 = Breakdowns.findOne({ communityId, name: 'Incomes' });
    const breakdown2 = Breakdowns.findOne({ communityId, name: 'Localizer' });
    obj[breakdown1.name] = { type: String, optional: true, label: breakdown1.name, 
      autoform: { options() { return breakdown1.leafOptions(); }, firstOption: () => __('(Select one)') },
    };
    obj[breakdown2.name] = { type: String, optional: true, label: breakdown2.name, 
      autoform: { options() { return breakdown2.nodeOptions(); }, firstOption: () => __('(Select one)') },
    };
    return new SimpleSchema(obj);
  }
  return new SimpleSchema([
    ParcelBillings.simpleSchema(),
    { accountFrom: { type: chooseAccountsSchema(), optional: true } },
  ]);
}

Template.Accounting.events({
  'click #breakdowns .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.insert',
      collection: Breakdowns,
      type: 'insert',
      //      type: 'method',
//      meteormethod: 'breakdowns.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #breakdowns .js-edit'(event) {
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
  'click #breakdowns .js-edit-af'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.update',
      collection: Breakdowns,
      doc: Breakdowns.findOne(id),
      type: 'update',
//      type: 'method-update',
//      meteormethod: 'journals.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #breakdowns .js-view'(event, instance) {
    const id = $(event.target).closest('button').data('id');
    const breakdown = Breakdowns.findOne(id);
    const modalContext = {
      title: 'View Breakdown',
      body: 'Nestable_edit',
      bodyContext: { json: breakdown, disabled: true },
    };
    Modal.show('Modal', modalContext);
  },
  'click #breakdowns .js-view-af'(event, instance) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.view',
      collection: Breakdowns,
      doc: Breakdowns.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #breakdowns .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.confirmAndCall(Breakdowns.remove, { _id: id }, {
      action: 'delete breakdown',
    });
  },
  'click #journals .js-new'(event, instance) {
    const defId = $(event.target).data("id");
    Session.set('activeTxDef', defId);
//    const def = TxDefs.findOne(defId);
    const def = TxDefRegistry.find(d => d.name === defId);
    Modal.show('Autoform_edit', {
      id: 'af.journal.insert',
      collection: Journals,
      schema: def.schema,
      omitFields: ['phase'],
//      type: 'method',
//      meteormethod: 'journals.insert',
      template: 'bootstrap3-inline',
    });
  },
/*  'click #journals .js-new-def'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.txdef.insert',
      collection: TxDefs,
      type: 'method',
      meteormethod: 'txDefs.insert',
      template: 'bootstrap3-inline',
    });
  },*/
  'click #journals .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.journal.update',
      collection: Journals,
//      schema: newJournalSchema(),
      omitFields: ['phase'],
      doc: Journals.findOne(id),
      type: 'method-update',
      meteormethod: 'journals.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #journals .js-view, #account-history .js-view'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.journal.view',
      collection: Journals,
      schema: Journals.inputSchema,
      omitFields: ['phase'],
      doc: Journals.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #journals .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    const tx = Journals.findOne(id);
    Modal.confirmAndCall(removeTx, { _id: id }, {
      action: 'delete journal',
      message: tx.isOld() ? 'Remove not possible after 24 hours' : '',
    });
  },
  'click #bills .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.bill.insert',
      collection: Journals,
      schema: newJournalSchema(),
      omitFields: ['phase'],
      type: 'method',
      meteormethod: 'bills.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #bills .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.bill.update',
      collection: Journals,
      schema: newJournalSchema(),
      omitFields: ['phase'],
      doc: Journals.findOne(id),
      type: 'method-update',
      meteormethod: 'bills.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #bills .js-view'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.bill.view',
      collection: Journals,
      schema: newJournalSchema(),
      omitFields: ['phase'],
      doc: Journals.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #bills .js-many'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.parcelBilling.insert',
      collection: ParcelBillings,
      schema: newParcelBillingSchema(),
      type: 'method',
      meteormethod: 'parcelBillings.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #bills .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.confirmAndCall(removeJournal, { _id: id }, {
      action: 'delete bill',
    });
  },
  'click #bills .js-bill'(event) {
    const communityId = Session.get('activeCommunityId');
    Modal.confirmAndCall(billParcels, { communityId }, {
      action: 'bill parcels',
      message: 'This will bill all parcels',
    });
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

AutoForm.addModalHooks('af.journal.insert');
AutoForm.addModalHooks('af.journal.update');
AutoForm.addHooks('af.journal.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.phase = 'done';
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.journal.insert');
    const defId = Session.get('activeTxDef');
    const def = TxDefRegistry.find(d => d.name === defId);
    def.transformToJournal(doc);
    const afContext = this;
    insertTx.call(doc, function handler(err, res) {
      if (err) {
//        displayError(err);
        afContext.done(err);
        return;
      }
      afContext.done(null, res);
    });
    return false;
  },
});

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');
AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.phase = 'plan';
    doc.amount *= -1;
    return doc;
  },
});

AutoForm.addModalHooks('af.parcelBilling.insert');
AutoForm.addHooks('af.parcelBilling.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
