import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export const Reports = {
  Egyenlegek() {
    const communityId = Session.get('activeCommunityId');
    const accountLots = PayAccounts.findOne({ communityId, name: 'Számlák' });
    return {
      name: 'Egyenlegek',
      filter: { phase: 'done' },
      rows: [
        { field: 'accounts.Számlák', values: accountLots.init().leafNames },
      ],
      cols: [],
    };
  },
  EvesBevetelek() {
    const communityId = Session.get('activeCommunityId');
    const payins = PayAccounts.findOne({ communityId, name: 'Bevételek' });
    return {
      name: 'Éves bevételek',
      rows: [
        { field: 'accounts.Bevételek', values: payins.init().leafNames, total: 'Bevételek' },
      ],
      cols: [
        { field: 'year', values: [2016, 2017] },
        { field: 'phase', values: ['plan', 'done'] },
      ],
    };
  },
  HaviBevetelek(year) {
    const communityId = Session.get('activeCommunityId');
    const befnem = PayAccounts.findOne({ communityId, name: 'Bevételek' });
    return {
      name: `Havi bevételek (${year})`,
      filter: { year, phase: 'done' },
      rows: [
        { field: 'accounts.Bevételek', values: befnem.init().leafNames, total: 'Bevételek' },
      ],
      cols: [
        { field: 'month', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], total: year.toString() },
      ],
    };
  },
  AlbetetekSzamlai(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Helyek' });
    const befnem = PayAccounts.findOne({ communityId, name: 'Bevételek' });
    return {
      name: `Albetétek Számlái (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Helyek', values: locator.init().leafNames },
      ],
      cols: [
        { field: 'accounts.Bevételek', values: befnem.init().leafNames, total: 'Albetét folyószámla' },
        { field: 'phase', values: ['plan', 'done'] },
      ],
    };
  },
  AlbetetemElszamolasa(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Helyek' });
    const payins = PayAccounts.findOne({ communityId, name: 'Bevételek' });
    const myParcels = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());

    return {
      name: `Albetétem Elszámolása (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Helyek', values: myParcels },
        { field: 'month', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], total: year.toString() },
      ],
      cols: [
        { field: 'accounts.Bevételek', values: payins.init().leafNames },
        { field: 'phase', values: ['plan', 'done'] },
      ],
    };
  },
  Nyito() {
    const communityId = Session.get('activeCommunityId');
    const accountLots = PayAccounts.findOne({ communityId, name: 'Számlák' });
    return {
      name: 'Nyitó',
      filter: { phase: 'done', ref: 'nyitó' },
      rows: [
        { field: 'accounts.Számlák', values: accountLots.init().leafNames },
      ],
      cols: [],
    };
  },
};
