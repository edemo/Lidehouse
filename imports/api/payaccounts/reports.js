import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { PaymentReport } from '/imports/api/payaccounts/payment-report.js';
import { expandFrom1To3Levels, monthTags, moveTags } from './payaccounts-utils';

export const Reports = {
  Blank() {
    const report = new PaymentReport('Blank');
    return report;
  },

  Egyenlegek() {
//    console.log(Template.instance().subscriptionsReady());
    const report = new PaymentReport('Egyenlegek');
    const communityId = Session.get('activeCommunityId');
    report.addFilter({ phase: 'done' });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'accounts.Assets',
      values: PayAccounts.findOne({ communityId, name: 'Assets' }),
    }, false);
    report.addTree('rows', {
      field: 'accounts.Liabilities',
      values: PayAccounts.findOne({ communityId, name: 'Liabilities' }),
    }, false);

    return report;
  },

  PenzugyekReszletei(year) {
    const report = new PaymentReport('Penzugyek Reszletei');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({
//      'accounts.Incomes': { $exists: true },
      phase: 'done',
    });

    report.addTree('cols', {
      field: 'month',
      values: PayAccounts._transform(monthTags),
    }, false);

    report.addTree('rows', {
      field: 'accounts.Incomes',
      values: PayAccounts.findOne({ communityId, name: 'Incomes' }),
    }, false);
    report.addTree('rows', {
      field: 'accounts.Expenses',
      values: PayAccounts.findOne({ communityId, name: 'Expenses' }),
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

  AlbetetemElszamolasa(year) {
    const report = new PaymentReport('Albetetek Elszamolasa');
    const communityId = Session.get('activeCommunityId');
    const myParcels = {
      name: 'Albetéteim', label: 'Összes albetét',
      children: [],
    };
    Memberships.find({ communityId, 'person.userId': Meteor.userId(), role: 'owner' })
      .map(m => myParcels.children.push({ name: m.parcel().serial.toString() /* + '. ' + __('parcel')*/ }));
    expandFrom1To3Levels(myParcels);

    report.addFilter({ phase: 'done' });

    report.addTree('rows', {
      field: 'accounts.Localizer',
      values: PayAccounts._transform(myParcels),
    }, false);

    report.addTree('rows', {
      field: 'accounts.Assets',
      values: PayAccounts.findOne({ communityId, name: 'Owner payins' }),
    }, true, true);

    report.addTree('cols', {
      field: 'move',
      values: PayAccounts._transform(moveTags),
    }, false, false);

    return report;
  },

  AlbetetekElszamolasa(year) {
    const report = new PaymentReport('Albetetek Elszamolasa');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({ phase: 'done' });

    report.addTree('rows', {
      field: 'accounts.Localizer',
      values: PayAccounts.findOne({ communityId, name: 'Localizer' }),
    }, false);

    report.addTree('cols', {
      field: 'accounts.Incomes',
      values: PayAccounts.findOne({ communityId, name: 'Owner payins' }),
    }, false, true);

    report.addTree('cols', {
      field: 'move',
      values: PayAccounts._transform(moveTags),
    }, true, false);

    return report;
  },
};
