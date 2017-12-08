import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export const Reports = {
  Egyenlegek() {
    const communityId = Session.get('activeCommunityId');
    const accountLots = PayAccounts.findOne({ communityId, name: 'Pénz számlák' });
    return {
      name: 'Egyenlegek',
      filter: { phase: 'done' },
      rows: [
        { field: 'accounts.Pénz számlák', values: accountLots.leafNames() },
      ],
      cols: [],
    };
  },
  EvesBevetelek() {
    const communityId = Session.get('activeCommunityId');
    const payins = PayAccounts.findOne({ communityId, name: 'Költség nemek' });
    return {
      name: 'Éves bevételek',
      rows: [
        { field: 'accounts.Költség nemek', values: payins.leafNames(), total: 'Költség nemek' },
      ],
      cols: [
        { field: 'year', values: [2016, 2017] },
        { field: 'phase', values: ['plan', 'done'] },
      ],
    };
  },
  HaviBevetelek(year) {
    const communityId = Session.get('activeCommunityId');
    const befnem = PayAccounts.findOne({ communityId, name: 'Költség nemek' });
    return {
      name: `Havi bevételek (${year})`,
      filter: { year, phase: 'done' },
      rows: [
        { field: 'accounts.Költség nemek', values: befnem.leafNames(), total: 'Költség nemek' },
      ],
      cols: [
        { field: 'month', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], total: year.toString() },
      ],
    };
  },
  AlbetetekSzamlai(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Könyvelési helyek' });
    const befnem = PayAccounts.findOne({ communityId, name: 'Költség nemek' });
    return {
      name: `Albetétek Számlái (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Könyvelési helyek', values: locator.leafNames() },
      ],
      cols: [
        { field: 'accounts.Költség nemek', values: befnem.leafNames(), total: 'Albetét folyószámla' },
        { field: 'phase', values: ['plan', 'done'] },
      ],
    };
  },
  AlbetetemEgyenlege(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Könyvelési helyek' });
    const myParcels = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());

    return {
      name: `Albetétem Egyenlege (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Könyvelési helyek', values: myParcels },
      ],
      cols: [
        { field: 'phase', values: ['plan', 'done'], total: 'Egyenleg' },
      ],
    };
  },
  AlbetetemElszamolasa(year) {
    const communityId = Session.get('activeCommunityId');
    const locator = PayAccounts.findOne({ communityId, name: 'Könyvelési helyek' });
    const payins = PayAccounts.findOne({ communityId, name: 'Költség nemek' });
    const myParcels = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());

    return {
      name: `Albetétem Elszámolása (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Könyvelési helyek', values: myParcels },
        { field: 'month', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], total: year.toString() },
      ],
      cols: [
        { field: 'accounts.Költség nemek', values: payins.leafNames() },
        { field: 'phase', values: ['plan', 'done'] },
      ],
    };
  },
  Nyito() {
    const communityId = Session.get('activeCommunityId');
    const accountLots = PayAccounts.findOne({ communityId, name: 'Pénz számlák' });
    return {
      name: 'Nyitó',
      filter: { phase: 'done', ref: 'nyitó' },
      rows: [
        { field: 'accounts.Pénz számlák', values: accountLots.leafNames() },
      ],
      cols: [],
    };
  },
};
