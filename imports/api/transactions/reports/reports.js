import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { TableReport } from '/imports/api/transactions/reports/table-report.js';
import { JournalEntries } from '/imports/api/transactions/entries.js';
import { PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import { SideBreakdown } from '/imports/api/transactions/breakdowns/tx-side.js';
import '/imports/api/transactions/breakdowns/template.js';

export const Reports = {
  Blank() {
    const report = new TableReport();
    return report;
  },

  Assets() {
    const communityId = Session.get('activeCommunityId');
    const chartOfAccounts = Breakdowns.findOneByName('ChartOfAccounts', communityId);
    const report = new TableReport(JournalEntries, chartOfAccounts);
    
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Assets', communityId),
    }, false);

    return report;
  },

  Liabilities() {
    const communityId = Session.get('activeCommunityId');
    const chartOfAccounts = Breakdowns.findOneByName('ChartOfAccounts', communityId);
    const report = new TableReport(JournalEntries, chartOfAccounts);
    
    report.addFilter({ phase: 'done', communityId });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Liabilities', communityId),
    }, false);

    return report;
  },

  Performance(year) {
    const communityId = Session.get('activeCommunityId');
    const chartOfAccounts = Breakdowns.findOneByName('ChartOfAccounts', communityId);
    const report = new TableReport(JournalEntries, chartOfAccounts);

    report.addFilter({
//      'account.Incomes': { $exists: true },
      phase: 'done',
      communityId,
      year,
    });

    report.addTree('cols', {
      field: 'period',
      values: PeriodBreakdown,
    }, false);

    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Incomes', communityId),
    }, false);
    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Expenses', communityId),
    }, false);
/*
    const planColDef = {
      value: 'Terv',
      filter() {
        return { year, phase: 'plan' };
      },
    };
    report.addLine('cols', [planColDef], true);
*/
    const prevYearColDef = {
      field: 'year',
      value: year - 1,
      class: 'total',
      filter() {
        return { year: year - 1 };
      },
    };
    report.addLine('cols', [prevYearColDef], true);

    return report;
  },

  MyParcelBalances(year) {
    const communityId = Session.get('activeCommunityId');
    const chartOfAccounts = Breakdowns.findOneByName('ChartOfAccounts', communityId);
    const report = new TableReport(JournalEntries, chartOfAccounts);
    const myParcels = {
      name: 'Albetéteim', label: 'Összes albetét',
      children: [],
    };
    Memberships.findActive({ communityId, approved: true, role: 'owner', userId: Meteor.userId() })
      .map(m => myParcels.children.push({ name: m.parcel().ref /* + '. ' + __('parcel')*/ }));

    report.addFilter({ communityId });

    report.addTree('rows', {
      field: 'localizer',
      values: Breakdowns._transform(myParcels),
    }, false);

    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Owner payin types', communityId),
    }, true, true);

    report.addTree('cols', {
      field: 'side',
      values: SideBreakdown,
    }, false, false);

    return report;
  },

  ParcelBalances(year) {
    const communityId = Session.get('activeCommunityId');
    const chartOfAccounts = Breakdowns.findOneByName('ChartOfAccounts', communityId);
    const report = new TableReport(JournalEntries, chartOfAccounts);

    report.addFilter({ communityId });

    report.addTree('rows', {
      field: 'localizer',
      values: Breakdowns.findOneByName('Localizer', communityId),
    }, false);

    report.addTree('cols', {
      field: 'account',
      values: Breakdowns.findOneByName('Owner payin types', communityId),
    }, false, true);

    report.addTree('cols', {
      field: 'side',
      values: SideBreakdown,
    }, true, false);

    return report;
  },
};
