/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Breakdowns } from '../breakdowns/breakdowns';
import { TableReport } from './table-report';
//import { BalanceReport } from './balance-report';
import { SideBreakdown } from '/imports/api/accounting/breakdowns/tx-side.js';

if (Meteor.isServer) {
  xdescribe('table reports', function () {
    this.timeout(15000);
    let JournalEntries;
    before(function () {
      JournalEntries = new Mongo.Collection('entries');
      JournalEntries.helpers({
        effectiveAmount() {
          let effectiveSign = 0;
          if (this.side === 'credit') effectiveSign = -1;
          if (this.side === 'debit') effectiveSign = +1;
          return this.amount * effectiveSign;
        },
      });
    });
    after(function () {
    });

    describe('reports', function () {
      before(function () {
        JournalEntries.insert({ side: 'debit', period: '2017-12', amount: 110 });
        JournalEntries.insert({ side: 'credit', period: '2017-12', amount: 120 });
      });

      it('table reports', function () {
        const chartOfAccounts = Breakdowns.findOneByName('COA', null);
        const report = new TableReport(JournalEntries, chartOfAccounts);

        report.addTree('cols', {
          field: 'side',
          values: SideBreakdown,
        }, false);

        report.addTree('rows', {
          field: 'period',
          values: PeriodBreakdown,
        }, false);

        const cells = [];
        for (let x = 0; x <= 2; x++) {
          cells[x] = [];
          for (let y = 0; y <= 2 * 12; y++) {
            cells[x][y] = report.cell(x, y);
          }
        }
        console.log(cells);
      });

      xit('balance reports', function () {
        const chartOfAccounts = Breakdowns.findOneByName('COA', null);
        const report = new BalanceReport(chartOfAccounts);

        report.addTree('cols', {
          field: 'side',
          values: SideBreakdown,
        }, false);

        report.addTree('rows', {
          field: 'period',
          values: PeriodBreakdown,
        }, false);

        const cells = [];
        for (let x = 0; x <= 2; x++) {
          cells[x] = [];
          for (let y = 0; y <= 2 * 12; y++) {
            cells[x][y] = report.cell(x, y);
          }
        }
        console.log(cells);
      });
    });
  });
}
