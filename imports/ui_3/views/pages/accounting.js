/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import { __ } from '/imports/localization/i18n.js';

import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { PeriodBreakdown } from '/imports/api/journals/breakdowns/breakdowns-utils.js';
import { journalColumns } from '/imports/api/journals/tables.js';
import { breakdownColumns } from '/imports/api/journals/breakdowns/tables.js';
import { Reports } from '/imports/api/journals/reports/reports.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Journals } from '/imports/api/journals/journals.js';
import { insert as insertTx, remove as removeTx } from '/imports/api/journals/methods.js';
import { TxDefs } from '/imports/api/journals/txdefs/txdefs.js';
import { ParcelBillings } from '/imports/api/journals/batches/parcel-billings.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
import { AccountSpecification } from '/imports/api/journals/account-specification';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/components/account-history.js';
import './accounting.html';

Template.Accounting.viewmodel({
  txDefSelected: '',
  txDefOptions: [],
  creditAccountSelected: '',
  debitAccountSelected: '',
//  partnerSelected: '',
//  referenceIdSelected: '',
  beginDate: '',
  endDate: '',
//  amount: undefined,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('breakdowns.inCommunity', { communityId });
      instance.subscribe('txdefs.inCommunity', { communityId });
      instance.subscribe('journals.incomplete', { communityId });
    });
  },
  autorun: [
    function setTxDefOptions() {
      this.txDefOptions(TxDefs.find().map(function (t) {
        return { value: t.name, label: __(t.name) };
      }));
      if (!this.txDefSelected() && this.txDefOptions() && this.txDefOptions().length > 0) {
        this.txDefSelected(this.txDefOptions()[0].value);
      }
    },
    function autoSelectFilterAccounts() {
      const txDef = TxDefs.findOne({ name: this.txDefSelected() });
      if (!txDef) return;
      this.creditAccountSelected(txDef.credit);
      this.debitAccountSelected(txDef.debit);
    },
    function txSubscription() {
      const communityId = Session.get('activeCommunityId');
      this.templateInstance.subscribe('journals.betweenAccounts', { communityId,
        creditAccount: this.creditAccountSelected(),
        debitAccount: this.debitAccountSelected(),
        begin: new Date(this.beginDate()),
        end: new Date(this.endDate()),
      });
    },
  ],
  report(name, year) {
    if (!Template.instance().subscriptionsReady()) return Reports['Blank']();
    return Reports[name](year);
  },
  txDefs() {
    const communityId = Session.get('activeCommunityId');
    const txdefs = TxDefs.find({ communityId });
    return txdefs;
  },
  mainBreakdownsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Breakdowns.find({ communityId, sign: { $exists: true } }).fetch();
    }
    return getTableData;
  },
  otherBreakdownsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Breakdowns.find({ communityId, sign: { $exists: false }, name: { $ne: 'COA' } }).fetch();
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
  journalsIncompleteTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Journals.find({ communityId, complete: false }).fetch();
    }
    return getTableData;
  },
  journalsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Journals.find({ communityId, complete: true }).fetch();
      // Filtered selector would be needed - but client side selector is slow, and we need everything anyways
    }
    return getTableData;
  },
  journalsOptionsFn() {
    function getOptions() {
      return _.extend({
        columns: journalColumns({ view: true, edit: true, delete: true }),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      }, DatatablesExportButtons);
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
  'click .breakdowns .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.insert',
      collection: Breakdowns,
      type: 'insert',
      //      type: 'method',
//      meteormethod: 'breakdowns.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .breakdowns .js-edit'(event) {
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
  'click .breakdowns .js-edit-af'(event) {
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
      template: 'bootstrap3-inline',
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
      template: 'bootstrap3-inline',
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
      template: 'bootstrap3-inline',
    });
  },
  'click .txdefs .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.confirmAndCall(TxDefs.remove, { _id: id }, {
      action: 'delete txDef',
    });
  },
  'click #journals .js-new'(event, instance) {
    const defId = $(event.target).data("id");
    Session.set('activeTxDef', defId);
    const def = TxDefs.findOne({ name: defId });
    Modal.show('Autoform_edit', {
      id: 'af.journal.insert',
      collection: Journals,
      schema: def.schema(),
//      type: 'method',
//      meteormethod: 'journals.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #journals .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.journal.update',
      collection: Journals,
//      schema: newJournalSchema(),
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

AutoForm.addModalHooks('af.journal.insert');
AutoForm.addModalHooks('af.journal.update');
AutoForm.addHooks('af.journal.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.journal.insert');
    const defId = Session.get('activeTxDef');
    const def = TxDefs.findOne({ name: defId });
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

AutoForm.addModalHooks('af.parcelBilling.insert');
AutoForm.addHooks('af.parcelBilling.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
