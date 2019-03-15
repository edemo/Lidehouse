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
import { monthTags } from '/imports/api/transactions/breakdowns/breakdowns-utils.js';
import { transactionColumns } from '/imports/api/transactions/tables.js';
import { breakdownColumns } from '/imports/api/transactions/breakdowns/tables.js';
import { Reports } from '/imports/api/transactions/reports/reports.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { insert as insertTx, remove as removeTx } from '/imports/api/transactions/methods.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
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
    const labels = ["Feb", "Marc", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
    const moneyData = {
      labels,
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
        {
          label: "Pénztár",
          backgroundColor: "rgba(179,148,26,0.5)",
          borderColor: "rgba(179,148,26,0.7)",
          pointBackgroundColor: "rgba(179,148,26,1)",
          pointBorderColor: "#fff",
          data: [10, 40, 40, 90, 60, 70, 90, 50, 80, 50, 75, 40],
        },
      ],
    };
    const loanData = {
      labels,
      datasets: [
        {
          label: "Bank hitel",
          backgroundColor: "rgba(220,220,220,0.5)",
          borderColor: "rgba(220,220,220,1)",
          pointBackgroundColor: "rgba(220,220,220,1)",
          pointBorderColor: "#fff",
          data: [1265, 1590, 1800, 1810, 1560, 1450, 1700, 1340, 1560, 1900, 2140, 2240],
        },
        {
          label: "Szállítók",
          backgroundColor: "rgba(26,179,148,0.5)",
          borderColor: "rgba(26,179,148,0.7)",
          pointBackgroundColor: "rgba(26,179,148,1)",
          pointBorderColor: "#fff",
          data: [280, 480, 400, 190, 860, 270, 590, 450, 280, 350, 575, 740],
        },
      ],
    };

    const chartOptions = { responsive: true };

    const moneyContext = document.getElementById('moneyChart').getContext('2d');
    new Chart(moneyContext, { type: 'line', data: moneyData, options: chartOptions });
    const loanContext = document.getElementById('loanChart').getContext('2d');
    new Chart(loanContext, { type: 'line', data: loanData, options: chartOptions });
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
  getBalance(account, period) {
    const coa = ChartOfAccounts.get(); if (!coa) return 0;
    const accountCode = parseInt(account, 10) ? account : coa.findNodeByName(account).code;
    return Balances.get({
      communityId: Session.get('activeCommunityId'),
      account: accountCode,
      tag: 'T',
    });
  },
  publishDate() {
    return new Date();
  },
  leafsOf(account) {
    const coa = ChartOfAccounts.get(); if (!coa) return [];
    const moneyAccounts = coa.findNodeByName(account);
    return moneyAccounts.leafs();
  },
  loanAccounts() {
    return ['Bank hitel', 'Szállítók'];
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
      template: 'bootstrap3-inline',
    });
  },
});
