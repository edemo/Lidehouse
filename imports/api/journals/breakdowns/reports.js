import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { TableReport } from '/imports/api/journals/breakdowns/table-report.js';
import { monthTags, moveTags } from './breakdowns-utils';

export const Reports = {
  Blank() {
    const report = new TableReport('Blank');
    return report;
  },

  Assets() {
    const report = new TableReport('Assets');
    const communityId = Session.get('activeCommunityId');
    
    report.addFilter({ phase: 'done', communityId });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'account.Assets',
      values: Breakdowns.findOne({ communityId, name: 'Assets' }),
    }, false);

    return report;
  },

  Liabilities() {
    const report = new TableReport('Liabilities');
    const communityId = Session.get('activeCommunityId');
    
    report.addFilter({ phase: 'done', communityId });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'account.Liabilities',
      values: Breakdowns.findOne({ communityId, name: 'Liabilities' }),
    }, false);

    return report;
  },

  Performance(year) {
    const report = new TableReport('Penzugyek Reszletei');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({
//      'account.Incomes': { $exists: true },
      phase: 'done',
      communityId,
    });

    report.addTree('cols', {
      field: 'month',
      values: Breakdowns._transform(monthTags),
    }, false);

    report.addTree('rows', {
      field: 'account.Incomes',
      values: Breakdowns.findOne({ communityId, name: 'Incomes' }),
    }, false);
    report.addTree('rows', {
      field: 'account.Expenses',
      values: Breakdowns.findOne({ communityId, name: 'Expenses' }),
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
    const report = new TableReport('My parcel balances');
    const communityId = Session.get('activeCommunityId');
    const myParcels = {
      name: 'Albetéteim', label: 'Összes albetét',
      children: [],
    };
    Memberships.find({ communityId, active: true, 'person.userId': Meteor.userId(), role: 'owner' })
      .map(m => myParcels.children.push({ name: m.parcel().serial.toString() /* + '. ' + __('parcel')*/ }));

    report.addFilter({ phase: 'done', communityId });

    report.addTree('rows', {
      field: 'account.Localizer',
      values: Breakdowns._transform(myParcels),
    }, false);

    report.addTree('rows', {
      field: 'account.Liabilities',
      values: Breakdowns.findOne({ communityId, name: 'Owner payins' }),
    }, true, true);

    report.addTree('cols', {
      field: 'move',
      values: Breakdowns._transform(moveTags),
    }, false, false);

    return report;
  },

  ParcelBalances(year) {
    const report = new TableReport('Parcel balances');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({ phase: 'done', communityId });

    report.addTree('rows', {
      field: 'account.Localizer',
      values: Breakdowns.findOne({ communityId, name: 'Localizer' }),
    }, false);

    report.addTree('cols', {
      field: 'account.Liabilities',
      values: Breakdowns.findOne({ communityId, name: 'Owner payins' }),
    }, false, true);

    report.addTree('cols', {
      field: 'move',
      values: Breakdowns._transform(moveTags),
    }, true, false);

    return report;
  },
};
