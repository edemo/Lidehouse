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

import { onSuccess, handleError, displayMessage } from '/imports/ui/lib/errors.js';
import { monthTags } from '/imports/api/journals/breakdowns/breakdowns-utils.js';
import { journalColumns } from '/imports/api/journals/tables.js';
import { breakdownColumns } from '/imports/api/journals/breakdowns/tables.js';
import { Reports } from '/imports/api/journals/breakdowns/reports.js';
import { Communities } from '/imports/api/communities/communities.js';
import { AccountSpecification } from '/imports/api/journals/account-specification.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Journals } from '/imports/api/journals/journals.js';
import { insert as insertTx, remove as removeTx } from '/imports/api/journals/methods.js';
import { TxDefRegistry } from '/imports/api/journals/txdefs/txdef-registry.js';
import { ParcelBillings } from '/imports/api/journals/batches/parcel-billings.js';
import { serializeNestable } from '/imports/ui_2/modals/nestable-edit.js';
import '/imports/ui_2/components/custom-table.js';
import '/imports/ui_2/modals/confirmation.js';
import '/imports/ui_2/modals/autoform-edit.js';
import './community-finances.html';

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

Template.Community_finances.onCreated(function communityFinancesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('breakdowns.inCommunity', { communityId });
    this.subscribe('journals.inCommunity', { communityId });
//    this.subscribe('txs.inCommunity', { communityId });
//    this.subscribe('txDefs.inCommunity', { communityId });
  });
});

Template.Community_finances.onRendered(function communityFinancesOnRendered() {
  // Filling the Balance Sheet chart with DEMO data
  this.autorun(() => {
    const doughnutData = {
      labels: [__('Bank főszámla'), __('Bank felújítási alap'), __('Hitelszámla'), __('Pénztár')],
      datasets: [{
        data: [6943500, 120000, 2300000, 100000],
        backgroundColor: choiceColors,
      }],
    };
    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('balanceSheetChart').getContext('2d');
    new Chart(elem, { type: 'doughnut', data: doughnutData, options: doughnutOptions });
  });

  // Filling the History chart with DEMO data
  this.autorun(() => {
    const monthsArray = monthTags.children.map(c => c.label);
    const barData = {
      labels: monthsArray,
      datasets: [{
        label: __('Bevételek (e Ft)'),
        data: [425, 425, 425, 425, 480, 428, 2725, 425, 1765, 925, 425, 425],
        backgroundColor: choiceColors[0],
        borderWidth: 2,
      }, {
        label: __('Kiadások (e Ft)'),
        data: [510, 520, 530, 500, 550, 510, 800, 1800, 880, 510, 550, 520],
        backgroundColor: choiceColors[1],
        borderWidth: 2,
      }],
    };
    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('historyChart').getContext('2d');
    new Chart(elem, { type: 'bar', data: barData, options: barOptions });
  });

  // Filling the Incomes chart with DEMO data
  this.autorun(() => {
    const doughnutData = {
      labels: [__('Lakói befizetések'), __('Kamat pénzintézetektől'), __('Hitelfelvétel'), __('Adóköteles bevételek'), __('Támogatás')],
      datasets: [{
        data: [6440000, 2150, 2300000, 558500, 500000],
        backgroundColor: choiceColors,
      }],
    };
    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('incomesChart').getContext('2d');
    new Chart(elem, { type: 'doughnut', data: doughnutData, options: doughnutOptions });
  });

  // Filling the Expenses chart with DEMO data
  this.autorun(() => {
    const doughnutData = {
      labels: [__('Költségek'), __('Beruházások'), __('Hiteltörlesztés')],
      datasets: [{
        data: [5000000, 2000000, 1000000],
        backgroundColor: choiceColors,
      }],
    };
    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('expensesChart').getContext('2d');
    new Chart(elem, { type: 'doughnut', data: doughnutData, options: doughnutOptions });
  });
});

Template.Community_finances.helpers({
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
      return Breakdowns.find({ communityId, sign: { $exists: true } }).fetch();
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
  journalsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
      return Journals.find({ communityId, phase: 'done' }).fetch();
    }
    return getTableData;
  },
  journalsOptionsFn() {
    function getOptions() {
      return {
        columns: journalColumns(),
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
      autoform: { options() { return breakdown1.leafOptions(l => true); } },
    };
    obj[breakdown2.name] = { type: String, optional: true, label: breakdown2.name, 
      autoform: { options() { return breakdown2.nodeOptions(); } },
    };
    return new SimpleSchema(obj);
  }
  return new SimpleSchema([
    ParcelBillings.simpleSchema(),
    { accountFrom: { type: chooseAccountsSchema(), optional: true } },
  ]);
}

Template.Community_finances.events({
  'click #breakdowns .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.breakdown.insert',
      collection: Breakdowns,
      omitFields: ['communityId'],
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
      omitFields: ['communityId'],
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
      omitFields: ['communityId'],
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
      omitFields: ['communityId', 'phase'],
//      type: 'method',
//      meteormethod: 'journals.insert',
      template: 'bootstrap3-inline',
    });
  },
/*  'click #journals .js-new-def'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.txdef.insert',
      collection: TxDefs,
      omitFields: ['communityId'],
      type: 'method',
      meteormethod: 'txDefs.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #journals .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.journal.update',
      collection: Journals,
      schema: newJournalSchema(),
      omitFields: ['communityId', 'phase'],
      doc: Journals.findOne(id),
      type: 'method-update',
      meteormethod: 'journals.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },*/
  'click #journals .js-view'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.journal.view',
      collection: Journals,
      schema: Journals.inputSchema,
      omitFields: ['communityId', 'phase'],
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
      omitFields: ['communityId', 'phase'],
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
      omitFields: ['communityId', 'phase'],
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
      omitFields: ['communityId', 'phase'],
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
      omitFields: ['communityId'],
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
/*
AutoForm.addModalHooks('af.txdef.insert');
AutoForm.addModalHooks('af.txdef.update');
AutoForm.addHooks('af.txdef.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
*/
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
