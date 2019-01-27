import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { TableReport } from '/imports/api/journals/reports/table-report.js';
import { JournalEntries } from '/imports/api/journals/entries.js';
import { yearMonthTags, sideTags } from '/imports/api/journals/breakdowns/breakdowns-utils';
import '/imports/api/journals/breakdowns/template.js';

export const Reports = {
  Blank() {
    const report = new TableReport(JournalEntries);
    return report;
  },

  Assets() {
    const report = new TableReport(JournalEntries);
    const communityId = Session.get('activeCommunityId');
    
    report.addFilter({ phase: 'done', communityId });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Assets', communityId),
    }, false);

    return report;
  },

  Liabilities() {
    const report = new TableReport(JournalEntries);
    const communityId = Session.get('activeCommunityId');
    
    report.addFilter({ phase: 'done', communityId });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Liabilities', communityId),
    }, false);

    return report;
  },

  Performance(year) {
    const report = new TableReport(JournalEntries);
    const communityId = Session.get('activeCommunityId');

    report.addFilter({
//      'account.Incomes': { $exists: true },
      phase: 'done',
      communityId,
    });

    report.addTree('cols', {
      field: 'period',
      values: Breakdowns._transform(yearMonthTags),
    }, false);

    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Incomes', communityId),
    }, false);
    report.addTree('rows', {
      field: 'account',
      values: Breakdowns.findOneByName('Expenses', communityId),
    }, false);

    const planColDef = {
      value: 'Terv',
      filter() {
        return { year, phase: 'plan' };
      },
    };
    report.addLine('cols', [planColDef], true);

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
    const report = new TableReport(JournalEntries);
    const communityId = Session.get('activeCommunityId');
    const myParcels = {
      name: 'Albetéteim', label: 'Összes albetét',
      children: [],
    };
    Memberships.find({ communityId, approved: true, active: true, role: 'owner', personId: Meteor.userId() })
      .map(m => myParcels.children.push({ name: m.parcel().ref /* + '. ' + __('parcel')*/ }));

    report.addFilter({ phase: 'done', communityId });

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
      values: Breakdowns._transform(sideTags),
    }, false, false);

    return report;
  },

  ParcelBalances(year) {
    const report = new TableReport(JournalEntries);
    const communityId = Session.get('activeCommunityId');

    report.addFilter({ phase: 'done', communityId });

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
      values: Breakdowns._transform(sideTags),
    }, true, false);

    return report;
  },
};
