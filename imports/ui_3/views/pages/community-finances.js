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
import { monthTags } from '/imports/api/journals/breakdowns/breakdowns-utils.js';
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
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/components/account-history.js';
import './community-finances.html';
import { AccountSpecification } from '../../../api/journals/account-specification';

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

Template.Community_finances.onCreated(function communityFinancesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
//    this.subscribe('breakdowns.inCommunity', { communityId });
//    this.subscribe('journals.inCommunity', { communityId });
//    this.subscribe('txs.inCommunity', { communityId });
//    this.subscribe('txDefs.inCommunity', { communityId });
  });
});

Template.Community_finances.onRendered(function communityFinancesOnRendered() {
  // Filling the Balance Sheet chart with DEMO data
  this.autorun(() => {
    const doughnutData = {
      labels: [__('Bank főszámla'), __('Bank felújítási alap'), __('Fundamenta felújítási hitel'), __('Pénztár')],
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
  optionsOf(accountCode) {
    const communityId = Session.get('activeCommunityId');
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = Breakdowns.findOneByName('ChartOfAccounts', communityId);
    if (brk) return brk.leafOptions(accountCode);
    return [];
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

Template.Community_finances.events({
  'click #journals .js-view, #account-history .js-view'(event) {
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
});
