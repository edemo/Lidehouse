/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { numeral } from 'meteor/numeral:numeral';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { monthTags, AccountingPeriods } from '/imports/api/transactions/periods/accounting-periods.js';
import { Period } from '/imports/api/transactions/periods/period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import '/imports/ui_3/views/blocks/chart.js';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/balance-report.js';
import '/imports/ui_3/views/components/disclaimer.js';

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
  { // indian yellow
    backgroundColor: "rgba(227, 168, 87, 0.5)",
    borderColor: "rgba(227, 168, 87, 0.7)",
    pointBackgroundColor: "rgba(227, 168, 87, 1)",
    pointBorderColor: "#fff",
  },
  { // pastel brown
    backgroundColor: "rgba(192, 165, 155, 0.5)",
    borderColor: "rgba(192, 165, 155, 0.7)",
    pointBackgroundColor: "rgba(192, 165, 155, 1)",
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

const chartLookbackMonths = 24;

function addArrays(array1, array2) {
  debugAssert(array1.length === array2.length);
  const result = [];
  for (let i=0; i< array1.length; ++i) {
    result.push(array1[i] + array2[i]);
  }
  return result;
};

Template.Community_finances.viewmodel({
  accountToView: '`382',
  periodBreakdown: undefined,
  communityId() { return ModalStack.getVar('communityId'); },
  community() { return Communities.findOne(this.communityId()); },
  startIndex() {
    let firstBalanceIndex = 0;
    this.periodBreakdown()?.leafs(this.communityId()).some((leaf, index) => {
      if (Balances.findOne({ tag: leaf.code })) {
        firstBalanceIndex = index;
        return true;
      }
    });
    return Math.max(firstBalanceIndex, this.endIndex() - chartLookbackMonths);
  },
  endIndex() {
    const leafs = this.periodBreakdown()?.leafs(this.communityId());
    const currentMonthIndex = leafs.findIndex(l => l.code === Period.currentMonthTag());
    if (currentMonthIndex < 0) return leafs.length - 1;  // 'Unable to find current month in the accountingPeriods',  _.pluck(this.periodBreakdown()?.leafs(this.communityId()), 'code'));
    if (this.community().settings.balancesUploaded && currentMonthIndex > 0) return currentMonthIndex - 1;
    else return currentMonthIndex;
  },
  periods() { return this.periodBreakdown()?.leafs(this.communityId()).slice(this.startIndex(), this.endIndex() + 1); },
  periodLabels() { return this.periods()?.map(l => `${l.label === 'JAN' ? __(l.parent.name) : __(l.label)}`); },

  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      const periodsDoc = AccountingPeriods.findOne({ communityId });
      if (periodsDoc) this.periodBreakdown(periodsDoc.breakdown());
      instance.subscribe('accounts.inCommunity', { communityId });
      instance.subscribe('accountingPeriods.inCommunity', { communityId });
      const monthTags = _.pluck(this.periods(), 'code');
      const monthCTags = monthTags.map(t => 'C' + t.substring(1));
//      const lastYear = periodsDoc?.years[periodsDoc.years.length - 1];
//      const prevYear = periodsDoc?.years[periodsDoc.years.length - 2];
//      const yearTags = [`O-${lastYear}`, `O-${prevYear}`, `T-${lastYear}`, `T-${prevYear}`];
      instance.subscribe('balances.inCommunity', { communityId, tags: ['T'].concat(monthTags, monthCTags) });
    });
//    instance.autorun(() => {
//      const periods = AccountingPeriods.findOne({ communityId: this.communityId() });
//      if (periods) this.periodBreakdown(periods.breakdown());
//    });
  },
  onRendered(instance) {
  },
  monthlyData(account, balanceType) {
    return this.periods().map(l => this.getBalance({ communityId: this.communityId(), account, tag: 'T' + l.code.substring(1) }, balanceType));
  },
  statusAccounts() {
    return ['Money accounts', 'Short-term liabilities'];
  },
  getStatusBalance() {
    return this.getBalance('Money accounts', 'C') - this.getBalance('Short-term liabilities', 'C');
  },
  statusData() {
    const data = {
      labels: this.periodLabels(),
      datasets: [
        _.extend({
          label: __("Money accounts"),
          data: this.monthlyData('Money accounts', 'C'),
        }, plusColors[0]),
        _.extend({
          label: __("Short-term liabilities"),
          data: this.monthlyData('Short-term liabilities', 'C'),
        }, minusColors[0]),
      ],
    };
    return data;
  },
  moneyOutstanding() {
    return this.getBalance('Members', 'C');
  },
  moneyOverpaid() {
    return this.getBalance(Accounts.getUnidentifiedIncomeAccount(this.communityId()), 'C');
  },
  moneyData() {
    const datasets = [];
    const moneyAccount = Accounts.findOneT({ communityId: this.communityId(), name: 'Money accounts' });
    moneyAccount?.leafs(this.communityId()).fetch().reverse().forEach((account, index) => {
      datasets.push(_.extend({
        label: __(account.name),
        data: this.monthlyData(account.code, 'C'),
        fill: true,
      }, plusColors[index + 1]));
    });
    const moneyData = { labels: this.periodLabels(), datasets };
    return moneyData;
  },
  commitmentAccounts() {
    return ['Long-term liabilities', 'Short-term liabilities'];
  },
  commitmentData() {
    const data = {
      labels: this.periodLabels(),
      datasets: [
        _.extend({
          label: __("Long-term liabilities"),
          data: this.monthlyData('Long-term liabilities', 'C'),
        }, minusColors[0]),
        _.extend({
          label: __("Short-term liabilities"),
          data: this.monthlyData('Short-term liabilities', 'C'),
        }, minusColors[0]),
      ],
    };
    return data;
  },
  normalChartOptions() {
    return {
      responsive: true,
      scales: {
        yAxes: [{
          ticks: {
            callback: (value, index, values) => numeral(value).format('0,0$'),
          },
        }],
      },
    };
  },
  stackedChartOptions() {
    return {
      responsive: true,
      scales: {
        yAxes: [{
          stacked: true,
          ticks: {
            callback: (value, index, values) => numeral(value).format('0,0$'),
          },
        }],
      },
    };
  },
  barData() {
    const monthsArray = monthTags.children.map(c => c.label);
    return {
      labels: this.periodLabels(),
      datasets: [{
        label: __('Incomes'),
        data: this.monthlyData('Incomes', 'T'),
        backgroundColor: choiceColors[0],
        borderWidth: 2,
      }, {
        label: __('Expenses'),
        data: addArrays(this.monthlyData('`5', 'T'), this.monthlyData('`8', 'T')),
        backgroundColor: choiceColors[1],
        borderWidth: 2,
      }],
    };
  },
  barOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yAxes: [{
          ticks: {
            callback: (value, index, values) => numeral(value).format('0,0$'),
          },
        }],
      },
    };
  },
  getBalance(def, balaceType) {
    let requestedDef;
    if (typeof def === 'object') {
      requestedDef = def;
    } else if (typeof def === 'string') {
      requestedDef = { communityId: this.communityId(), account: def, tag: 'T' };  
    }
    if (!requestedDef.account.startsWith('`')) {
      const a = Accounts.findOneT({ communityId: requestedDef.communityId, name: requestedDef.account });
      if (!a) {
        Log.warning('No such account:', requestedDef.account);
        return 0;
      }
      requestedDef.account = a.code;
    }
   const balanceOnAccount = Balances.get(requestedDef, balaceType).displayTotal();
    requestedDef.account = Accounts.toTechnicalCode(requestedDef.account);
    const balanceOnTechnical = Balances.get(requestedDef, balaceType).displayTotal();
    return balanceOnAccount + balanceOnTechnical;
  },
  leafsOf(account) {
    const accounts = Accounts.findOneT({ communityId: this.communityId(), name: account });
    if (!accounts) {
      Log.warning('No such account:', account);
      return [];
    }
    return accounts.leafs(this.communityId());
  },
//  breakdown(name) {
//    return Breakdowns.findOneByName(name, ModalStack.getVar('communityId'));
//  },
  totalTag() {
    return ['T'];
  },
  last12MonthsTag() {
    return ['T-2017-1', 'T-2017-2', 'T-2017-3', 'T-2017-4', 'T-2017-5', 'T-2017-6',
          'T-2017-7', 'T-2017-8', 'T-2017-9', 'T-2017-10', 'T-2017-11', 'T-2017-12'];
  },
  subAccountOptionsOf(accountCode) {
    return Accounts.nodeOptionsOf(getActiveCommunityId(), accountCode, true);
  },
  beginDate() {
    return moment().startOf('month').format('YYYY-MM-DD');
  },
});

Template.Community_finances.events({
  'click #moneyBalances .js-view'(event, instance) {
//    event.preventDefault(); // the <a> functionality destroys the instance.data!!!
    const accountCode = $(event.target).closest('a').data('id');
    instance.viewmodel.accountToView(accountCode);
  },
});
