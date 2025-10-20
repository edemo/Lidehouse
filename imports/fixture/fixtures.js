import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { debugAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { AccountingPeriods } from '/imports/api/accounting/periods/accounting-periods.js';
import { Templates } from '/imports/api/accounting/templates/templates.js';
import { CommunityBuilder } from './community-builder.js';

export function insertUnittestFixture(lang) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

  // ===== Communities =====

  let demoCommunity = Communities.findOne({ name: 'Unittest house' });
  debugAssert(!demoCommunity, 'Db was not cleaned before unit test');
  demoCommunity = Factory.create('community', {
    name: 'Unittest house',
  });
  const demoCommunityId = demoCommunity._id;

  const otherCommunityId = Factory.create('community', {
    name: 'Another community',
  })._id;

  const demoBuilder = new CommunityBuilder(demoCommunityId, 'demo', lang);
  const otherBuilder = new CommunityBuilder(otherCommunityId, 'test', lang);

  const com = { en: 'com', hu: 'hu' }[lang];
  const demoAdminId = demoBuilder.createLoginableUser('admin');
  const demoManagerId = demoBuilder.createLoginableUser('manager');
  const demoAccountantId = demoBuilder.createLoginableUser('accountant');
  const otherAdminId = otherBuilder.createLoginableUser('admin');
  const otherManagerId = otherBuilder.createLoginableUser('manager');

// ===== Parcels =====

const dummyParcels = [];
  dummyParcels[0] = demoBuilder.createProperty({
    units: 0,
    floor: 'G',
    door: '00',
    type: 'other',
    area: 0,
  });
  dummyParcels[1] = demoBuilder.createProperty({
    units: 10,
    floor: 'P',
    door: '01',
    type: 'parking',
    area: 10,
  });
  dummyParcels[2] = demoBuilder.createProperty({
    units: 20,
    floor: 'P',
    door: '02',
    type: 'storage',
    group: 'small',
    area: 20,
  });
  dummyParcels[3] = demoBuilder.createProperty({
    units: 30,
    floor: '1',
    door: '03',
    type: 'flat',
    area: 30,
  });
  dummyParcels[4] = demoBuilder.createProperty({
    units: 40,
    floor: '1',
    door: '04',
    type: 'flat',
    area: 40,
  });
  const otherParcelId = otherBuilder.createProperty({
    units: 40,
    floor: '1',
    door: '04',
    type: 'flat',
    area: 40,
  });

  demoBuilder.create('meter', {
    parcelId: dummyParcels[3],
    service: 'coldWater',
    uom: 'm3',
    identifier: 'CW-01010101',
    activeTime: { begin: new Date('2018-01-01') },
  });


  // ===== Demo owners =====

  const demoUserId = demoBuilder.createLoginableUser('owner', undefined, { parcelId: dummyParcels[0], ownership: { share: new Fraction(1, 10) } });
  const demoBenefactorId = demoBuilder.createLoginableUser('benefactor', undefined, { parcelId: dummyParcels[0], benefactorship: { type: 'rental' } });
  const otherUserId = otherBuilder.createLoginableUser('owner', undefined, { parcelId: otherParcelId, ownership: { share: new Fraction(1, 10) } });

  // ===== Dummy Users =====

  const dummyUsers = [];
  for (let userNo = 0; userNo <= 5; userNo++) {
    dummyUsers[userNo] = demoBuilder.createDummyUser();
  }

  // ===== Memberships =====

  demoBuilder.createMembership(dummyUsers[0], 'maintainer');
  demoBuilder.createMembership(dummyUsers[1], 'treasurer');
  demoBuilder.createMembership(dummyUsers[1], 'owner', {
    parcelId: dummyParcels[1],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  // This person is benefactor of parcel[1], but he is not a registered user of the app
  const nonUserPerson = {
    idCard: {
      type: 'natural',
      name: __('demo.user.1.benefactor.name'),
      address: __('demo.user.1.benefactor.address'),
      identifier: '987201NA',
      dob: new Date(1951, 1, 5),
      mothersName: __('demo.user.1.benefactor.mothersName'),
    },
  };
  demoBuilder.createMembership(nonUserPerson, 'benefactor', {
    parcelId: dummyParcels[1],
    benefactorship: {
      type: 'rental',
    },
  });
  // This parcel is owned by a legal entity, and the representor for them is user[2]
  const legalPerson = {
    idCard: {
      type: 'legal',
      name: __('demo.user.3.company.name'),
      address: __('demo.user.3.company.address'),
      identifier: 'Cg.123456-89',
    },
  };
  demoBuilder.createMembership(legalPerson, 'owner', {
    parcelId: dummyParcels[2],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  // --- ---
  demoBuilder.createMembership(dummyUsers[2], 'owner', {
    parcelId: dummyParcels[2],
    ownership: {
      share: new Fraction(0),
      representor: true,
    },
  });
  demoBuilder.createMembership(dummyUsers[3], 'owner', {
    parcelId: dummyParcels[3],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  demoBuilder.createMembership(dummyUsers[3], 'owner', {
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 2),
      representor: false,
    },
  });
  demoBuilder.createMembership(dummyUsers[4], 'owner', {
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
      representor: true,
    },
  });
  demoBuilder.createMembership(dummyUsers[5], 'owner', {
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
      representor: false,
    },
  });

  // Give them some parcels in the other community, so to make tests more realistic with more than 1 community
//  otherBuilder.createMembership(dummyUsers[1], 'owner');
//  otherBuilder.createMembership(dummyUsers[2], 'benefactor');
  otherBuilder.createMembership(dummyUsers[3], 'admin');
  otherBuilder.createMembership(dummyUsers[4], 'accountant');
  otherBuilder.createMembership(dummyUsers[5], 'manager');

  // Contracts
  dummyParcels.forEach((parcelId, i) => {
    const parcel = Parcels.findOne(parcelId);
    if (i === 1) {
      demoBuilder.create('memberContract', {
        parcelId,
        leadParcelId: dummyParcels[3],
      });
    } else { // i = 0, 2, 3, 4
      demoBuilder.create('memberContract', {
        parcelId,
        partnerId: parcel._payerMembership().partnerId,
        habitants: i,
      });
    }
  });
  // ===== Forum =====

  ['0', '1', '2'].forEach((topicNo) => {
    const topicId = demoBuilder.create('forum', {});
    ['0', '1', '2'].forEach((commentNo) => {
      demoBuilder.create('comment', { topicId });
    });
  });

  // ===== News =====

  ['0', '1', '2'].forEach((topicNo) => {
    const topicId = demoBuilder.create('news', {
      sticky: topicNo == 2,
    });
  });

  // ===== Votes =====

  const agendaId = demoBuilder.create('agenda');
  const voterships = demoCommunity.voterships();
  
  Clock.setSimulatedTime(moment().subtract(20, 'day').toDate());
  const voteTopic0 = demoBuilder.create('vote', {
    agendaId,
    closesAt: moment().subtract(10, 'day').toDate(),  // its past close date
    vote: {
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castVote._execute({ userId: voterships[0].userId }, { topicId: voteTopic0, castedVote: [2] });  // no
  castVote._execute({ userId: voterships[1].userId }, { topicId: voteTopic0, castedVote: [1] });  // yes
  castVote._execute({ userId: voterships[2].userId }, { topicId: voteTopic0, castedVote: [2] });  // no
  castVote._execute({ userId: voterships[3].userId }, { topicId: voteTopic0, castedVote: [0] });  // abstain

  Clock.clear();
  demoBuilder.execute(Topics.methods.statusChange, { topicId: voteTopic0, status: 'votingFinished' });
  demoBuilder.execute(Topics.methods.statusChange, { topicId: voteTopic0, status: 'closed' });

  const voteTopic1 = demoBuilder.create('vote', {
    agendaId,
    closesAt: moment().add(2, 'week').toDate(),
    vote: {
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  // No one voted on this yet

  const voteTopic2 = demoBuilder.create('vote', {
    // not part of any agenda
  });

  castVote._execute({ userId: voterships[1].userId }, { topicId: voteTopic2, castedVote: [1, 2, 3, 4] });
  castVote._execute({ userId: voterships[2].userId }, { topicId: voteTopic2, castedVote: [2, 3, 4, 1] });
  castVote._execute({ userId: voterships[3].userId }, { topicId: voteTopic2, castedVote: [3, 4, 1, 2] });

  ['0', '1'].forEach(commentNo =>
    demoBuilder.create('comment', {
      topicId: voteTopic2,
    })
  );

  // ===== Tickets =====

  ['0', '1', '2'].forEach((topicNo) => {
    const topicId = demoBuilder.create('issue', {});
  });

  // ===== Rooms =====

  const chatPartnerId = dummyUsers[2];
  const demoMessageRoom = demoBuilder.create('room', {
    creatorId: demoUserId,
    participantIds: [demoUserId, chatPartnerId],
  });
  demoBuilder.create('comment', {
    creatorId: chatPartnerId,
    topicId: demoMessageRoom,
  });
  demoBuilder.create('comment', {
    creatorId: demoUserId,
    topicId: demoMessageRoom,
  });

  // ===== Breakdowns =====

  demoBuilder.execute(Transactions.methods.setAccountingTemplate, { communityId: demoCommunityId }, demoAccountantId);

  // ===== Transactions =====

  const supplier = demoBuilder.create('supplier', { idCard: { type: 'legal', name: 'Supplier Inc' } });
  const customer = demoBuilder.create('customer', { idCard: { type: 'legal', name: 'Customer Inc' } });

  const supplierContract = demoBuilder.create('contract', { relation: 'supplier', partnerId: supplier });
  const customerContract = demoBuilder.create('contract', { relation: 'customer', partnerId: customer });

  const parcelBilling = demoBuilder.create('parcelBilling', {
    title: 'Test area',
    projection: {
      base: 'area',
      unitPrice: 300,
    },
    digit: '3',
    localizer: '@',
  });

  //
//  otherBuilder.insertLoadsOfFakeMembers(10);

  // ===== Returning a bunch of pointers, for easy direct access
  const wholeFixture = {
    demoCommunityId,
    otherCommunityId,
    demoUserId,
    demoAdminId,
    demoManagerId,
    demoAccountantId,
    otherAdminId,
    otherManagerId,
    otherUserId,
    dummyUsers,
    dummyParcels,
    supplier,
    customer,
    supplierContract,
    customerContract,
    parcelBilling,
    builder: demoBuilder,
    partnerId(userId) { return Meteor.users.findOne(userId).partnerId(this.demoCommunityId); },
  };
//  console.log("Whole Fixture", wholeFixture);
  return wholeFixture;
}
