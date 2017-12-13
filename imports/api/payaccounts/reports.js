import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

const phaseTags = {
  name: '',
  children: [
    { name: '',
      children: [
        { name: 'balance',
          children: [
          { name: 'bill' },
          { name: 'done' },
          ],
        },
      ],
    },
  ],
};

const yearTags = {
  name: '',
  children: [
    { name: '',
      children: [
        { name: '',
          children: [
          { name: 2006 },
          { name: 2007 },
          ],
        },
      ],
    },
  ],
};

const monthTags = {
  name: '',
  children: [
    { name: '2007',
      children: [
        { name: '',
          children: [
          { name: 1 },
          { name: 2 },
          { name: 3 },
          { name: 4 },
          { name: 5 },
          { name: 6 },
          { name: 7 },
          { name: 8 },
          { name: 9 },
          { name: 10 },
          { name: 11 },
          { name: 12 },
          ],
        },
      ],
    },
  ],
};

export const Reports = {
  Egyenlegek() {
    const communityId = Session.get('activeCommunityId');
    return {
      name: 'Egyenlegek',
      filter: { phase: 'done' },
      rows: [
        { field: 'accounts.Pénz számlák', values: PayAccounts.findOne({ communityId, name: 'Pénz számlák' }) },
      ],
      cols: [],
    };
  },
  EvesBevetelek() {
    const communityId = Session.get('activeCommunityId');
    return {
      name: 'Éves bevételek',
      rows: [
        { field: 'accounts.Költség nemek', values: PayAccounts.findOne({ communityId, name: 'Költség nemek' }) },
      ],
      cols: [
        { field: 'date', values: PayAccounts._transform(monthTags) },
        { field: 'phase', values: PayAccounts._transform(phaseTags) },
      ],
    };
  },
  HaviBevetelek(year) {
    const communityId = Session.get('activeCommunityId');
    return {
      name: `Havi bevételek (${year})`,
      filter: { year, phase: 'done' },
      rows: [
        { field: 'accounts.Költség nemek', values: PayAccounts.findOne({ communityId, name: 'Költség nemek' }) },
      ],
      cols: [
        { field: 'date', values: PayAccounts._transform(monthTags) },
      ],
    };
  },
  AlbetetekSzamlai(year) {
    const communityId = Session.get('activeCommunityId');
    return {
      name: `Albetétek Számlái (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Könyvelési helyek', values: PayAccounts.findOne({ communityId, name: 'Könyvelési helyek' }) },
      ],
      cols: [
        { field: 'accounts.Költség nemek', values: PayAccounts.findOne({ communityId, name: 'Költség nemek' }) },
        { field: 'phase', values: PayAccounts._transform(phaseTags) },
      ],
    };
  },
  AlbetetemEgyenlege(year) {
    const communityId = Session.get('activeCommunityId');
//    const myParcels = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());

    return {
      name: `Albetétem Egyenlege (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Könyvelési helyek', values: PayAccounts.findOne({ communityId, name: 'Könyvelési helyek' }) },
      ],
      cols: [
        { field: 'phase', values: PayAccounts._transform(phaseTags) },
      ],
    };
  },
  AlbetetemElszamolasa(year) {
    const communityId = Session.get('activeCommunityId');
//    const myParcels = Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());

    return {
      name: `Albetétem Elszámolása (${year})`,
      filter: { year },
      rows: [
        { field: 'accounts.Könyvelési helyek', values: PayAccounts.findOne({ communityId, name: 'Könyvelési helyek' }) },
        { field: 'date', values: PayAccounts._transform(monthTags) },
      ],
      cols: [
        { field: 'accounts.Költség nemek', values: PayAccounts.findOne({ communityId, name: 'Költség nemek' }) },
        { field: 'phase', values: PayAccounts._transform(phaseTags) },
      ],
    };
  },
  Nyito() {
    const communityId = Session.get('activeCommunityId');
    return {
      name: 'Nyitó',
      filter: { phase: 'done', ref: 'nyitó' },
      rows: [
        { field: 'accounts.Pénz számlák', values: PayAccounts.findOne({ communityId, name: 'Pénz számlák' }) },
      ],
      cols: [],
    };
  },
};
