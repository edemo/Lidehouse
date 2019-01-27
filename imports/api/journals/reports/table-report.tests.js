/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Breakdowns } from '../breakdowns/breakdowns';
import { TableReport } from './table-report';
import { sideTags, yearTags, monthTags, yearMonthTags } from '../breakdowns/breakdowns-utils';

if (Meteor.isServer) {
  describe('table reports', function () {
    this.timeout(5000);
    let JournalEntries;
    before(function () {
      JournalEntries = new Mongo.Collection('entries');
      JournalEntries.helpers({
        effectiveAmount() {
          let effectiveSign = 0;
          if (this.side === 'Cr') effectiveSign = -1;
          if (this.side === 'Dr') effectiveSign = +1;
          return this.amount * effectiveSign;
        },
      });
    });
    after(function () {
    });

    describe('reports', function () {
      before(function () {
        JournalEntries.insert({ side: 'Dr', month: '-01', amount: 110 });
        JournalEntries.insert({ side: 'Dr', month: '-01', amount: 120 });
      });

      it('reports', function () {
        const report = new TableReport(JournalEntries);

        report.addTree('cols', {
          field: 'side',
          values: Breakdowns._transform(sideTags),
        }, false);
/*
        report.addTree('rows', {
          field: 'year',
          values: Breakdowns._transform(yearTags),
        });
*/
        report.addTree('rows', {
          field: 'month',
          values: Breakdowns._transform(monthTags),
        }, false);

        const cells = [];
        for (let x = 0; x < 3; x++) {
          cells[x] = [];
          for (let y = 0; y < 13; y++) {
            cells[x][y] = report.cell(x, y);
          }
        }
        console.log(cells);
      });
    });
  });
}
