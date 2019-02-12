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
import { AccountSpecification } from '/imports/api/journals/account-specification';
import { Balances } from '/imports/api/journals/balances/balances';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/components/account-history.js';
import './community-finances.html';

const DEMO = false;

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

Template.Community_finances.onCreated(function communityFinancesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('balances.inCommunity', { communityId });
//    this.subscribe('breakdowns.inCommunity', { communityId });
//    this.subscribe('journals.inCommunity', { communityId });
//    this.subscribe('txs.inCommunity', { communityId });
//    this.subscribe('txDefs.inCommunity', { communityId });
  });
});

Template.Community_finances.onRendered(function communityFinancesOnRendered() {
  // Filling the Balances chart with DEMO data
  this.autorun(() => {
    const lineData = {
      labels: ["Feb", "Marc", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
      datasets: [
        {
          label: "Folyószámla",
          backgroundColor: "rgba(26,179,148,0.5)",
          borderColor: "rgba(26,179,148,0.7)",
          pointBackgroundColor: "rgba(26,179,148,1)",
          pointBorderColor: "#fff",
          data: [280, 480, 400, 190, 860, 270, 590, 450, 280, 350, 575, 740],
        },
        {
          label: "Megtakarítási számla",
          backgroundColor: "rgba(220,220,220,0.5)",
          borderColor: "rgba(220,220,220,1)",
          pointBackgroundColor: "rgba(220,220,220,1)",
          pointBorderColor: "#fff",
          data: [1265, 1590, 1800, 1810, 1560, 1450, 1700, 1340, 1560, 1900, 2140, 2240],
        },
      ],
    };

    const lineOptions = { responsive: true };

    const ctx = document.getElementById('balancesChart').getContext('2d');
    new Chart(ctx, { type: 'line', data: lineData, options: lineOptions });
  });
/*
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
*/
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

});

Template.Community_finances.helpers({
  moneyBalance() {
    if (DEMO) return '2 992 650 Ft';

    const coa = Breakdowns.chartOfAccounts(); if (!coa) return 0;
    const moneyAccounts = coa.findNodeByName('Money accounts');
    const balanceDef = {
      communityId: Session.get('activeCommunityId'),
      account: moneyAccounts.code,
      tag: 'T',
    };
    return Balances.get(balanceDef);
  },
  moneyAccounts() {
    if (DEMO) return [{
      accountName: 'Folyószámla',
      balance: '740 275 Ft',
    }, {
      accountName: 'Megtakarítási számla',
      balance: '2 240 510 Ft',
    }];

    const results = [];
    const coa = Breakdowns.chartOfAccounts(); if (!coa) return [];
    const moneyAccounts = coa.findNodeByName('Money accounts');
    moneyAccounts.leafs().forEach(leaf => {
      const balanceDef = {
        communityId: Session.get('activeCommunityId'),
        account: leaf.code,
        tag: 'T',
      };
      results.push({
        accountName: leaf.name,
        accountBalance: Balances.get(balanceDef),
      });
    });
    return results;
  },
  report(name, year) {
    if (!Template.instance().subscriptionsReady()) return Reports['Blank']();
    return Reports[name](year);
  },
  optionsOf(accountCode) {
    const communityId = Session.get('activeCommunityId');
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = Breakdowns.chartOfAccounts(communityId);
    if (brk) return brk.leafOptions(accountCode);
    return [];
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
