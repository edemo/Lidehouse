import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { PaymentReport } from '/imports/api/payaccounts/payment-report.js';
import { expandFrom1To3Levels, monthTags, phaseTags } from './payaccounts-utils';


export const TulajdonosiBefizetesek = expandFrom1To3Levels({
  name: 'Tulajdonosi Befizetesek', label: 'Összesen',
  children: [
  { name: 'Közös költség befizetés' },
  { name: 'Felújítási alap befizetés' },
  { name: 'Felújítási célbefizetés' },
//    { name: 'Támogatás' },
  { name: 'Víz díj' },
  { name: 'Fűtési díj' },
//    { name: 'Kamat pénzintézetektől' },
  { name: 'Egyéb közvetített szolgáltatás' },
  ],
});

export const Reports = {
  Blank() {
    const report = new PaymentReport('Blank');
    return report;
  },

  Egyenlegek() {
    const report = new PaymentReport('Egyenlegek');
    const communityId = Session.get('activeCommunityId');
    report.addFilter({ phase: 'done' });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'accounts.Pénz számla',
      values: PayAccounts.findOne({ communityId, name: 'Pénz számla' }),
    }, false);
    return report;
  },

  PenzugyekReszletei(year) {
    const report = new PaymentReport('Penzugyek Reszletei');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({ phase: 'done' });

    report.addTree('cols', {
      field: 'month',
      values: PayAccounts._transform(monthTags),
    }, false);

    const koltsegNemekWoBackoffice = PayAccounts.findOne({ communityId, name: 'Könyvelés nem' });
    koltsegNemekWoBackoffice.removeSubTree('Back office műveletek');
    koltsegNemekWoBackoffice.name = '';

    report.addTree('rows', {
      field: 'accounts.Könyvelés nem',
      values: koltsegNemekWoBackoffice,
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
    Memberships.find({ communityId, 'active.now': true, role: 'owner', 'person.userId': Meteor.userId() })
      .map(m => myParcels.children.push({ name: m.parcel().serial.toString() /* + '. ' + __('parcel')*/ }));
    expandFrom1To3Levels(myParcels);

    report.addFilter({ phase: { $in: ['bill', 'done'] } });

    report.addTree('rows', {
      field: 'accounts.Könyvelés helye',
      values: PayAccounts._transform(myParcels),
    }, false);

    report.addTree('rows', {
      field: 'accounts.Könyvelés nem',
      values: PayAccounts._transform(TulajdonosiBefizetesek),
    }, true, true);

    report.addTree('cols', {
      field: 'phase',
      values: PayAccounts._transform(phaseTags),
    }, false, false);

    return report;
  },

  AlbetetekElszamolasa(year) {
    const report = new PaymentReport('Albetetek Elszamolasa');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({ phase: { $in: ['bill', 'done'] } });

    report.addTree('rows', {
      field: 'accounts.Könyvelés helye',
      values: PayAccounts.findOne({ communityId, name: 'Könyvelés helye' }),
    }, false);

    report.addTree('cols', {
      field: 'accounts.Könyvelés nem',
      values: PayAccounts._transform(TulajdonosiBefizetesek),
    }, false, true);

    report.addTree('cols', {
      field: 'phase',
      values: PayAccounts._transform(phaseTags),
    }, true, false);

    return report;
  },
};
