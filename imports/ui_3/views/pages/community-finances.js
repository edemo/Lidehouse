/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { numeral } from 'meteor/numeral:numeral';
import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import { __ } from '/imports/localization/i18n.js';

import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { monthTags, PeriodBreakdown } from '/imports/api/transactions/breakdowns/breakdowns-utils.js';
import { Reports } from '/imports/api/transactions/reports/reports.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { AccountSpecification } from '/imports/api/transactions/account-specification';
import { Balances } from '/imports/api/transactions/balances/balances';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/balance-report.js';
import './community-finances.html';

const choiceColors = ['#a3e1d4', '#ed5565', '#b5b8cf', '#9CC3DA', '#f8ac59']; // colors taken from the theme
const notVotedColor = '#dedede';

// generated with:
// https://coolors.co/ed6a5e-dbbea1-a37b73-e3a857-1ab394
// https://www.hexcolortool.com

const plusColors = [
  { // green
    backgroundColor: "rgba(26,179,148,0.5)",
    borderColor: "rgba(26,179,148,0.7)",
    pointBackgroundColor: "rgba(26,179,148,1)",
    pointBorderColor: "#fff",
  },
  { // blue
    backgroundColor: "rgba(87, 117, 144,0.5)",
    borderColor: "rgba(87, 117, 144,1)",
    pointBackgroundColor: "rgba(87, 117, 144,1)",
    pointBorderColor: "#fff",
  },
  { // green
    backgroundColor: "rgba(26,179,148,0.5)",
    borderColor: "rgba(26,179,148,0.7)",
    pointBackgroundColor: "rgba(26,179,148,1)",
    pointBorderColor: "#fff",
  },
  { // pastel brown
    backgroundColor: "rgba(192, 165, 155, 0.5)",
    borderColor: "rgba(192, 165, 155, 0.7)",
    pointBackgroundColor: "rgba(192, 165, 155, 1)",
    pointBorderColor: "#fff",
  },
  { // indian yellow
    backgroundColor: "rgba(227, 168, 87, 0.5)",
    borderColor: "rgba(227, 168, 87, 0.7)",
    pointBackgroundColor: "rgba(227, 168, 87, 1)",
    pointBorderColor: "#fff",
  },
];

const minusColors = [
  { // red
    backgroundColor: "rgba(237, 106, 94, 0.5)",
    borderColor: "rgba(237, 106, 94, 0.7)",
    pointBackgroundColor: "rgba(237, 106, 94, 1)",
    pointBorderColor: "#fff",
  },
  { // pastel pink
    backgroundColor: "rgba(208, 173, 167, 0.5)",
    borderColor: "rgba(208, 173, 167, 0.7)",
    pointBackgroundColor: "rgba(208, 173, 167, 1)",
    pointBorderColor: "#fff",
  },
  { // pastel dark 1
    backgroundColor: "rgba(163, 123, 115,  0.5)",
    borderColor: "rgba(163, 123, 115,  0.7)",
    pointBackgroundColor: "rgba(163, 123, 115, 1)",
    pointBorderColor: "#fff",
  },
  { // pastel dark 2
    backgroundColor: "rgba(173, 106, 108,  0.5)",
    borderColor: "rgba(173, 106, 108,  0.7)",
    pointBackgroundColor: "rgba(173, 106, 108, 1)",
    pointBorderColor: "#fff",
  },
  { // grey
    backgroundColor: "rgba(220,220,220,0.5)",
    borderColor: "rgba(220,220,220,1)",
    pointBackgroundColor: "rgba(220,220,220,1)",
    pointBorderColor: "#fff",
  },
];

Template.Community_finances.viewmodel({
  accountToView: '323',
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('breakdowns.inCommunity', { communityId });
      instance.subscribe('balances.ofAccounts', { communityId });
    });
  },
  onRendered(instance) {
    instance.autorun(this.syncBalanceChartData);
    instance.autorun(this.syncHistoryChartData);
  },
  syncBalanceChartData() {
    const communityId = Session.get('activeCommunityId');
    const community = Communities.findOne(communityId);
    const DEMO = community && _.contains(['Test house', 'Teszt ház', 'Demo house', 'Demo ház'], community.name);
    const startTag = 'T-2016-12';
    const endTag = PeriodBreakdown.currentCode();
    const startIndex = PeriodBreakdown.leafs().findIndex(l => l.code === startTag);
    const endIndex = PeriodBreakdown.leafs().findIndex(l => l.code === endTag);
    const periods = PeriodBreakdown.leafs().slice(startIndex, endIndex);
    const prePeriods = PeriodBreakdown.leafs().slice(0, startIndex);
    const labels = periods.map(l => `${l.label === 'JAN' ? l.parent.name : l.label}`);
    const demoLabels = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
    const aggregate = function (array, startValue) {
      let sum = startValue || 0;
      return array.map((elem) => { sum += elem; return sum; });
    };
    const monthlyDataFromTbalances = function (account) {
      return aggregate(
        periods.map(l => Balances.getDisplayTotal({ communityId, account, tag: l.code })),
        aggregate(prePeriods.map(l => Balances.getDisplayTotal({ communityId, account, tag: l.code }))).pop()
      );
    };
    const monthlyDataFromCbalances = function (account) {
      return periods.map(l => Balances.getDisplayTotal({ communityId, account, tag: 'C' + l.code.substring(1) }));
    };
    const statusData = DEMO ? {
      labels: demoLabels,
      datasets: [
        _.extend({
          label: __("Money accounts"),
          data: [1265, 1590, 1800, 1810, 1560, 1450, 1700, 1340, 1560, 1900, 2140, 2240],
        }, plusColors[0]),
        _.extend({
          label: __("Commitments"),
          data: [280, 480, 400, 190, 860, 270, 590, 450, 280, 350, 575, 740],
        }, minusColors[0]),
      ],
    } : {
      labels,
      datasets: [
        _.extend({
          label: __("Money accounts"),
          data: monthlyDataFromCbalances('38'),
        }, plusColors[0]),
        _.extend({
          label: __("Commitments"),
          data: monthlyDataFromTbalances('46'),
        }, minusColors[0]),
      ],
    };
    let moneyData;
    if (DEMO) {
      moneyData = {
        labels: demoLabels,
        datasets: [
          _.extend({
            label: "Folyószámla",
            data: [280, 480, 400, 190, 860, 270, 590, 450, 280, 350, 575, 740],
          }, plusColors[0]),
          _.extend({
            label: "Megtakarítási számla",
            data: [1265, 1590, 1800, 1810, 1560, 1450, 1700, 1340, 1560, 1900, 2140, 2240],
          }, plusColors[1]),
          _.extend({
            label: "Pénztár",
            data: [10, 40, 40, 90, 60, 70, 90, 50, 80, 50, 75, 40],
          }, plusColors[2]),
        ],
      };
    } else {
      const datasets = [];
      const coa = ChartOfAccounts.get();
      const moneyAccounts = coa ? coa.findNodeByName('Money accounts') : [];
      moneyAccounts.leafs().forEach((account, index) => {
        datasets.push(_.extend({
          label: account.name,
          data: monthlyDataFromCbalances(account.code),
        }, plusColors[index + 1]));
      });
      moneyData = { labels, datasets };
    }
    const commitmentData = DEMO ? {
      labels: demoLabels,
      datasets: [
        _.extend({
          label: "Hosszú lejáratú bank hitel",
          data: [1265, 1590, 1800, 1810, 1560, 1450, 1700, 1340, 1560, 1900, 2140, 2240],
        }, minusColors[1]),
        _.extend({
          label: __("Suppliers"),
          data: [280, 480, 400, 190, 860, 270, 590, 450, 280, 350, 575, 740],
        }, minusColors[2]),
      ],
    } : {
      labels,
      datasets: [
        _.extend({
          label: __("Suppliers"),
          data: monthlyDataFromTbalances('46'),
        }, minusColors[0]),
      ],
    };
    const chartOptions = {
      responsive: true,
      scales: {
        yAxes: [{
          ticks: {
            callback: (value, index, values) => numeral(value).format('0,0$'),
          },
        }],
      },
    };

    const statusContext = document.getElementById('statusChart').getContext('2d');
    new Chart(statusContext, { type: 'line', data: statusData, options: chartOptions });
    const moneyContext = document.getElementById('moneyChart').getContext('2d');
    new Chart(moneyContext, { type: 'line', data: moneyData, options: chartOptions });
    const commitmentContext = document.getElementById('commitmentChart').getContext('2d');
    new Chart(commitmentContext, { type: 'line', data: commitmentData, options: chartOptions });
  },
  syncHistoryChartData() {
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
  },
  getBalance(account) {
    const communityId = Session.get('activeCommunityId');
    const coa = ChartOfAccounts.get(); if (!coa) return 0;
    const accountCode = parseInt(account, 10) ? account : coa.findNodeByName(account).code;
    return Balances.getDisplayTotal({ communityId, account: accountCode, tag: 'P' })
      || Balances.getDisplayTotal({ communityId, account: accountCode, tag: 'C' });
  },
  getStatusBalance() {
    return this.getBalance('Money accounts') - this.getBalance('Suppliers');
  },
  statusAccounts() {
    return [
      { name: 'Money accounts', code: '38' },
      { name: 'Commitments', code: '46' },
    ];
  },
  publishDate() {
    return Balances.findOne({ tag: 'P' }).updatedAt;
  },
  leafsOf(account) {
    const coa = ChartOfAccounts.get(); if (!coa) return [];
    const moneyAccounts = coa.findNodeByName(account);
    return moneyAccounts.leafs();
  },
  commitmentAccounts() {
    return ['HOSSZÚ LEJÁRATÚ KÖTELEZETTSÉGEK', 'RÖVID LEJÁRATÚ KÖTELEZETTSÉGEK', 'Suppliers'];
  },
  breakdown(name) {
    return Breakdowns.findOneByName(name, Session.get('activeCommunityId'));
  },
  totalTag() {
    return ['T'];
  },
  last12MonthsTag() {
    return ['T-2017-1', 'T-2017-2', 'T-2017-3', 'T-2017-4', 'T-2017-5', 'T-2017-6',
          'T-2017-7', 'T-2017-8', 'T-2017-9', 'T-2017-10', 'T-2017-11', 'T-2017-12'];
  },
  report(name, year) {
    if (!Template.instance().subscriptionsReady()) return Reports['Blank']();
    return Reports[name](year);
  },
  subAccountOptionsOf(accountCode) {
//    const accountSpec = new AccountSpecification(communityId, accountCode, undefined);
    const brk = ChartOfAccounts.get();
    if (brk) return brk.nodeOptionsOf(accountCode, true);
    return [];
  },
});

Template.Community_finances.events({
  'click #moneyBalances .js-view'(event, instance) {
//    event.preventDefault(); // the <a> functionality destroys the instance.data!!!
    const accountCode = $(event.target).closest('a').data('id');
    instance.viewmodel.accountToView(accountCode);
  },
  'click #account-history .js-view'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.transaction.view',
      collection: Transactions,
      schema: Transactions.inputSchema,
      doc: Transactions.findOne(id),
      type: 'readonly',
    });
  },
});
