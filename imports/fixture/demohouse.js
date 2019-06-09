import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { defaultRoles } from '/imports/api/permissions/roles.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/comments/methods.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import '/imports/api/transactions/breakdowns/methods.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';
import { Clock } from '/imports/utils/clock';
import { CommunityBuilder, DemoCommunityBuilder } from './community-builder.js';

export function insertDemoHouse(lang, demoOrTest) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

  const demoHouseName = __(`${demoOrTest}.house`);
  const demoHouse = Communities.findOne({ name: demoHouseName });

  if (demoHouse) {
    if (Meteor.settings.reset) {
      demoHouse.remove();
    } else {
//      Balances.checkAllCorrect();
      return;
    }
  }

  console.log('Creating house:', demoHouseName);
  const demoCommunityId = Communities.insert({
    name: __(`${demoOrTest}.house`),
    zip: '1144',
    city: __('demo.city'),
    street: __('demo.street'),
    number: '86',
    lot: '4532/8',
    avatar: '/images/demohouse.jpg',
    totalunits: 10000,
  });

  const demoBuilder = new CommunityBuilder(demoCommunityId, demoOrTest, lang);

// ===== Parcels =====

  const demoParcels = [];
  demoParcels[0] = demoBuilder.createParcel({
    units: 489,
    floor: __('demo.groundCode'),
    door: '01',
    type: 'flat',
    area: 55,
    volume: 176,
    habitants: 2,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[1] = demoBuilder.createParcel({
    units: 427,
    floor: __('demo.groundCode'),
    door: '02',
    type: 'flat',
    area: 48,
    volume: 153.6,
    habitants: 2,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[2] = demoBuilder.createParcel({
    units: 587,
    floor: '1',
    door: '03',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 3,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[3] = demoBuilder.createParcel({
    units: 622,
    floor: '1',
    door: '04',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 1,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[4] = demoBuilder.createParcel({
    units: 587,
    floor: '2',
    door: '05',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 3,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[5] = demoBuilder.createParcel({
    units: 622,
    floor: '2',
    door: '06',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 4,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[6] = demoBuilder.createParcel({
    units: 587,
    floor: '3',
    door: '07',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 2,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[7] = demoBuilder.createParcel({
    units: 622,
    floor: '3',
    door: '08',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 2,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[8] = demoBuilder.createParcel({
    units: 587,
    floor: '4',
    door: '09',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 2,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[9] = demoBuilder.createParcel({
    units: 622,
    floor: '4',
    door: '10',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 3,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[10] = demoBuilder.createParcel({
    units: 996,
    floor: __('demo.atticCode'),
    door: '11',
    type: 'flat',
    area: 112,
    habitants: 5,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[11] = demoBuilder.createParcel({
    units: 444,
    floor: __('demo.cellarCode'),
    door: '01',
    type: 'cellar',
    area: 50,
    habitants: 1,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[12] = demoBuilder.createParcel({
    units: 613,
    floor: __('demo.cellarCode'),
    door: '02',
    type: 'cellar',
    area: 69,
    habitants: 1,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[13] = demoBuilder.createParcel({
    units: 196,
    floor: __('demo.groundCode'),
    door: '00',
    type: 'shop',
    area: 22,
    habitants: 1,
    waterMetered: false,
    heatingType: 'ownHeating',
  });

  // ===== Non-loginable Dummy Users =====

  for (let userNo = 0; userNo < 18; userNo++) {
    const dummyUserId = demoBuilder.createDummyUser();
    switch (userNo) {
      case 2: demoBuilder.createMembership(dummyUserId, 'maintainer'); break;
      case 3: demoBuilder.createMembership(dummyUserId, 'accountant'); break;
      case 4:
      case 10:
      case 16: demoBuilder.createMembership(dummyUserId, 'overseer'); break;
      default: break;
    }
  }
  const demoMaintainerId = demoBuilder.dummyUsers[2];
  const demoAccountantId = demoBuilder.dummyUsers[3];
  const dummyUserId = demoBuilder.dummyUsers[5];

  // ===== Ownerships =====

  [0, 1, 4, 5, 6, 7, 8, 9, 10, 12].forEach((parcelNo) => {
    demoBuilder.createMembership(parcelNo, 'owner', {
      parcelId: demoParcels[parcelNo],
      ownership: { share: new Fraction(1, 1) },
    });
  });
  demoBuilder.createMembership(5, 'owner', {
    parcelId: demoParcels[11],
    ownership: { share: new Fraction(1, 1) },
  });
  demoBuilder.createMembership(2, 'owner', {
    parcelId: demoParcels[2],
    ownership: {
      share: new Fraction(1, 2),
      representor: true,
    },
  });
  demoBuilder.createMembership(14, 'owner', {
    parcelId: demoParcels[2],
    ownership: {
      share: new Fraction(1, 2),
      representor: false,
    },
  });
  [3, 13].forEach((parcelNo) => {
    // This legal person is represented by a user
    const legalPerson = {
      idCard: {
        type: 'legal',
        name: __(`demo.user.${parcelNo}.company.name`),
        address: __(`demo.user.${parcelNo}.company.address`),
        identifier: __(`demo.user.${parcelNo}.company.regno`),
      },
    };
    demoBuilder.createMembership(legalPerson, 'owner', {
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(1, 1),
      },
    });
    demoBuilder.createMembership(parcelNo, 'owner', {
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(0),
        representor: true,
      },
    });
  });
  [1, 7].forEach((parcelNo) => {
    // This person is benefactor of parcel[], but she is not a registered user of the app
    const nonUserPerson = {
      idCard: {
        type: 'natural',
        name: __(`demo.user.${parcelNo}.benefactor.name`),
        address: __(`demo.user.${parcelNo}.benefactor.address`),
        identifier: `${parcelNo}87201NA`,
        dob: new Date(1965, `${parcelNo}`, 5),
        mothersName: __(`demo.user.${parcelNo}.benefactor.mothersName`),
      },
    };
    demoBuilder.createMembership(nonUserPerson, 'benefactor', {
      parcelId: demoParcels[parcelNo],
      benefactorship: { type: 'rental' },
    });
  });
  demoBuilder.createMembership(11, 'benefactor', {
    parcelId: demoParcels[4],
    benefactorship: { type: 'rental' },
  });
  demoBuilder.createMembership(15, 'benefactor', {
    parcelId: demoParcels[5],
    benefactorship: { type: 'favor' },
  });
  demoBuilder.createMembership(16, 'benefactor', {
    parcelId: demoParcels[8],
    benefactorship: { type: 'favor' },
  });
  demoBuilder.createMembership(17, 'benefactor', {
    parcelId: demoParcels[9],
    benefactorship: { type: 'rental' },
  });

  // ==== Loginable users with Roles =====

  const demoManagerId = demoBuilder.createLoginableUser('manager', {
    avatar: '/images/avatars/avatar20.jpg',
    'profile.phone': '06 60 555 4321',
  });

  const demoAdminId = demoBuilder.createLoginableUser('admin', {
    avatar: '/images/avatars/avatar21.jpg',
    'profile.phone': '06 60 762 7288',
  });

  if (demoOrTest === 'test') {
    defaultRoles.forEach((role) => {
      if (role.name === 'manager' || role.name === 'admin') return;

      const parcelId = Parcels.findOne({ communityId: demoCommunityId, serial: 7 })._id;
      let ownershipData;
      if (role.name === 'owner') {
        Memberships.update({ parcelId }, { $set: { ownership: { share: new Fraction(1, 2), representor: false } } });
        ownershipData = { parcelId, ownership: { share: new Fraction(1, 2), representor: true } };
      } else if (role.name === 'benefactor') {
        ownershipData = { parcelId, benefactorship: { type: 'rental' } };
      }

      const firstNames = __('demo.user.firstNames').split('\n');
      demoBuilder.createLoginableUser(role.name, {
        avatar: '/images/avatars/avatarTestUser.png',
        profile: { lastName: __(role.name).capitalize(), firstName: _.sample(firstNames) },
      }, ownershipData);
    });
  }

  // ===== Forum =====

  // The demo (filling) users comment one after the other, round robin style
  let nextUserIndex = 1;
  function sameUser() {
    return demoBuilder.dummyUsers[nextUserIndex];
  }
  function nextUser() {
    nextUserIndex += 7; // relative prime
    nextUserIndex %= demoBuilder.dummyUsers.length;
    return demoBuilder.dummyUsers[nextUserIndex];
  }

  const demoTopicDates = [
    moment('2017-08-03 17:32').toDate(),
    moment('2017-09-16 08:25').toDate(),
    moment('2018-07-09 15:10').toDate(),
  ];

  ['0', '1', '2'].forEach((topicNo) => {
    Clock.setSimulatedTime(demoTopicDates[topicNo]);
    const topicId = demoBuilder.create('forum', {
      userId: nextUser(),
      title: __(`demo.topic.${topicNo}.title`),
      text: __(`demo.topic.${topicNo}.text`),
    });

    ['0', '1', '2'].forEach((commentNo) => {
      Clock.setSimulatedTime(moment(demoTopicDates[topicNo]).add((commentNo + 1) * 45, 'minutes').toDate());
      const path = `demo.topic.${topicNo}.comment.${commentNo}`;
      const commentText = __(path);
      if (commentText !== path) {
        demoBuilder.createComment({
          topicId,
          userId: (topicNo == 2 && commentNo == 2) ? sameUser() : nextUser(),
          text: commentText,
        });
      }
    });
  });
  Clock.clear();

  // ===== News =====

  ['0', '1'].forEach((newsNo) => {
    Clock.setSimulatedTime(moment().subtract(1, 'weeks').toDate());
    const newsId = demoBuilder.create('news', {
      userId: demoBuilder.dummyUsers[0],
      title: __(`demo.news.${newsNo}.title`),
      text: __(`demo.news.${newsNo}.text`),
    });
   
    // This sticky news item is not displayed now
    /* if (newsNo == 2) {
      Topics.update(newsId, {
        $set: {
          text: 'Doctor: <span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +36 (1) 345-562 <br>' +
                'Polizei: <small class="text-alt">07</small> <br>' +
                'Information: <small class="text-alt"><span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +3630 6545621' +
                ' / <span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> baltazar.imre@demo.com</small>',
          sticky: true,
        },
      });
    }*/
  });
  Clock.clear();

  // ===== Votes =====

  const agenda0 = demoBuilder.create('agenda', {
    title: __('demo.agenda.0.title'),
//    topicIds: [voteTopic0, voteTopic1],
  });
  const agenda1 = demoBuilder.create('agenda', {
    title: __('demo.agenda.1.title'),
//    topicIds: [voteTopic3, voteTopic4, voteTopic5],
  });

  const ownerships = Memberships.find({ communityId: demoCommunityId, active: true, role: 'owner', 'person.userId': { $exists: true } }).fetch();
  function castDemoVotes(topicId, votes) {
    votes.forEach((v, index) => {
      if (v) castVote._execute({ userId: ownerships[index].person.userId }, { topicId, castedVote: v });
    });
  }

  Clock.setSimulatedTime(moment(demoTopicDates[1]).add(1, 'weeks').toDate());
  const voteTopic0 = demoBuilder.create('vote', {
    userId: demoManagerId,
    title: __('demo.vote.0.title'),
    text: __('demo.vote.0.text'),
    agendaId: agenda0,
    vote: {
      closesAt: moment(demoTopicDates[1]).add(5, 'weeks').toDate(),  // its past close date
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castDemoVotes(voteTopic0, [[1], [0], [2], [0], [0], [0], [2], [0], [0], [1], [0], [0], [0]]);
  Clock.setSimulatedTime(moment(demoTopicDates[1]).add(5, 'weeks').toDate());
  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic0 }); // This vote is already closed
  Clock.clear();
  
  Clock.setSimulatedTime(moment('2017-09-20 09:04').toDate());
  const voteTopic1 = demoBuilder.create('vote', {
    userId: demoManagerId,
    title: __('demo.vote.1.title'),
    text: __('demo.vote.1.text'),
    agendaId: agenda0,
    vote: {
      closesAt: moment('2017-10-14 09:04').toDate(),
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castDemoVotes(voteTopic1, [[0], [0], [0], [0], [0], [0], [0], [0], [0], [1], [0], [0]]);
  Clock.setSimulatedTime(moment('2017-10-14 09:04').toDate());
  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic1 }); // This vote is already closed
  Clock.clear();

  Clock.setSimulatedTime(moment('2018-01-03 13:12').toDate());
  const voteTopic2 = demoBuilder.create('vote', {
    userId: dummyUserId,
    title: __('demo.vote.2.title'),
    text: __('demo.vote.2.text'),
    vote: {
      closesAt: moment('2018-01-18 22:45').toDate(),
      procedure: 'online',
      effect: 'poll',
      type: 'choose',
      choices: [
        __('demo.vote.2.choice.0'),
        __('demo.vote.2.choice.1'),
      ],
    },
  });

  castDemoVotes(voteTopic2, [null, null, null, null, null, null, null, [0], [0], [0], [0], [0]]);
  Clock.setSimulatedTime(moment('2018-01-18 22:45').toDate());
  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic2 }); // This vote is already closed
  Clock.clear();

  Clock.setSimulatedTime(moment().subtract(3, 'weeks').toDate());
  const voteTopic3 = demoBuilder.create('vote', {
    userId: demoManagerId,
    title: __('demo.vote.3.title'),
    text: __('demo.vote.3.text'),
    agendaId: agenda1,
    vote: {
      closesAt: moment().add(2, 'month').toDate(),
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  // No one voted on this yet

  Clock.setSimulatedTime(moment().subtract(1, 'weeks').toDate());
  const voteTopic4 = demoBuilder.create('vote', {
    userId: ownerships[1].person.userId,
    title: __('demo.vote.4.title'),
    text: __('demo.vote.4.text'),
    agendaId: agenda1,
    vote: {
      closesAt: moment().add(2, 'month').toDate(),
      type: 'preferential',
      procedure: 'online',
      effect: 'poll',
      choices: [
        __('demo.vote.4.choice.0'),
        __('demo.vote.4.choice.1'),
        __('demo.vote.4.choice.2'),
        __('demo.vote.4.choice.3'),
      ],
    },
  });

  castDemoVotes(voteTopic4, [null, [0, 1, 2, 3], null, [1, 2, 3, 0], null, [2, 3, 0, 1], null, [1, 0, 2, 3], null, [1, 2, 3, 0], null, [1, 2, 0, 3]]);
  ['0', '1'].forEach((commentNo) => {
    Clock.setSimulatedTime(moment().subtract(3, 'days').add(commentNo + 2, 'minutes').toDate());
    demoBuilder.createComment({
      topicId: voteTopic4,
      userId: nextUser(),
      text: __(`demo.vote.4.comment.${commentNo}`),
    });
  });
  Clock.clear();

  Clock.setSimulatedTime(moment().subtract(3, 'days').toDate());
  const voteTopic5 = demoBuilder.create('vote', {
    userId: ownerships[8].person.userId,
    title: __('demo.vote.5.title'),
    text: __('demo.vote.5.text'),
    agendaId: agenda1,
    vote: {
      closesAt: moment().add(2, 'month').toDate(),
      procedure: 'online',
      effect: 'poll',
      type: 'petition',
    },
  });

  castDemoVotes(voteTopic5, [[0], [0]]);
  Clock.clear();

  // ===== Shareddocs =====

  const serverFilePath = 'assets/app/demohouseDocs/';

  demoBuilder.uploadShareddoc({
    file: serverFilePath + 'alaprajz.jpg',
    name: {
      en: 'Floorplan.jpg',
      hu: 'Alaprajz.jpg',
    },
    type: 'image/jpg',
    folder: 'main',
  });
  demoBuilder.uploadShareddoc({
    file: {
      en: serverFilePath + 'phone.xls',
      hu: serverFilePath + 'telefon.xls',
    },
    name: {
      en: 'Important_phone_numbers.xls',
      hu: 'Fontos_telefonszámok.xls',
    },
    type: 'application/vnd.ms-excel',
    folder: 'main',
  });
  demoBuilder.uploadShareddoc({
    file: {
      en: serverFilePath + 'act.pdf',
      hu: serverFilePath + 'tv.pdf',
    },
    name: {
      en: 'Act.pdf',
      hu: 'Társasházi_törvény.pdf',
    },
    type: 'application/pdf',
    folder: 'main',
  });
  demoBuilder.uploadShareddoc({
    file: {
      en: serverFilePath + 'bylaws.pdf',
      hu: serverFilePath + 'szmsz.pdf',
    },
    name: {
      en: 'ByLaws.pdf',
      hu: 'SZMSZ_201508.pdf',
    },
    type: 'application/pdf',
    folder: 'community',
  });
  demoBuilder.uploadShareddoc({
    file: serverFilePath + 'kerekpartarolo.jpg',
    name: {
      en: 'bikestorage.jpg',
      hu: 'kerekpartarolo.jpg',
    },
    type: 'image/jpg',
    folder: 'voting',
  });

  // ===== Tickets =====

  const ticket0 = demoBuilder.create('ticket', {
    userId: nextUser(),
    title: __('demo.ticket.0.title'),
    text: __('demo.ticket.0.text'),
    ticket: {
      category: 'building',
      urgency: 'high',
      status: 'progressing',
    },
  });

  Clock.setSimulatedTime(moment().subtract(3, 'months').add(25, 'minutes').toDate());
  const ticket1 = demoBuilder.create('ticket', {
    userId: nextUser(),
    title: __('demo.ticket.1.title'),
    text: __('demo.ticket.1.text'),
    ticket: {
      category: 'building',
      urgency: 'normal',
      status: 'closed',
    },
  });
  Clock.setSimulatedTime(moment().subtract(3982, 'minutes').toDate());
  const ticket2 = demoBuilder.create('ticket', {
    userId: nextUser(),
    title: __('demo.ticket.2.title'),
    text: __('demo.ticket.2.text'),
    ticket: {
      category: 'service',
      urgency: 'normal',
      status: 'reported',
    },
  });
  Clock.setSimulatedTime(moment().subtract(3950, 'minutes').toDate())
  demoBuilder.createComment({
    topicId: ticket2,
    userId: nextUser(),
    text: __('demo.ticket.2.comment.0'),
  });

  Clock.setSimulatedTime(moment().subtract(6, 'weeks').add(123, 'minutes').toDate());
  const ticket3 = demoBuilder.create('ticket', {
    userId: nextUser(),
    title: __('demo.ticket.3.title'),
    text: __('demo.ticket.3.text'),
    ticket: {
      category: 'building',
      urgency: 'low',
      status: 'closed',
    },
  });
  Clock.clear();

  // ===== Accounting =====

  Transactions.methods.cloneAccountingTemplates._execute({ userId: demoAccountantId },
    { communityId: demoCommunityId });

  // === Parcel Billings ===

  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(mm => {
    const valueDate = new Date(`2017-${mm}-12`);

    demoBuilder.createParcelBilling({
      valueDate,
      projection: 'perArea',
      amount: 275,
      payinType: demoBuilder.name2code('Owner payin types', 'Közös költség előírás'),
      localizer: '@',
    });

    const parcelsWithNoWaterMeter = Parcels.find({ communityId: demoCommunityId, waterMetered: false });
    parcelsWithNoWaterMeter.forEach((parcel) => {
      demoBuilder.createParcelBilling({
        valueDate,
        projection: 'perHabitant',
        amount: 2500,
        payinType: demoBuilder.name2code('Owner payin types', 'Hidegvíz előírás'),
        localizer: Localizer.parcelRef2code(parcel.ref),
      });
    });

    demoBuilder.createParcelBilling({
      valueDate,
      projection: 'perArea',
      amount: 85,
      payinType: demoBuilder.name2code('Owner payin types', 'Fűtési díj előírás'),
      localizer: '@A',
    });
  });

  demoBuilder.createParcelBilling({
    projection: 'absolute',
    amount: 75000,
    valueDate: new Date('2017-08-15'),
    payinType: demoBuilder.name2code('Owner payin types', 'Rendkivüli befizetés előírás'),
    localizer: '@',
    note: __('demo.transactions.note.0'),
  });

  // === Owner Payins ===
  function everybodyPaysHisObligations() {
    const obligationAccount = ChartOfAccounts.get(demoCommunityId).findNodeByName('Owner obligations');
    const obligationLeafAccounts = obligationAccount.leafs();
    obligationLeafAccounts.forEach((leafAccount) => {
      const txs = Transactions.find({ communityId: demoCommunityId, 'debit.account': leafAccount.code });
      txs.forEach((tx) => {
        tx.journalEntries().forEach((entry) => {
          if (entry.side === 'debit') {
            demoBuilder.createTx({
              valueDate: moment(entry.valueDate).add(_.sample([-2, -1, 0, 1, 2]), 'days').toDate(),
              amount: entry.amount,
              credit: [{
                account: entry.account,
                localizer: entry.localizer,
              }],
              debit: [{
                account: demoBuilder.name2code('Assets', 'Folyószámla'),
              }],
            });
          }
        });
      });
    });
  }

  everybodyPaysHisObligations();

  // Some unpaid bills (so we can show the parcels that are in debt)
  demoBuilder.createParcelBilling({
    projection: 'perArea',
    amount: 200,
    valueDate: new Date('2017-12-15'),
    payinType: demoBuilder.name2code('Owner payin types', 'Rendkivüli befizetés előírás'),
    localizer: '@',
  });

  // Unidentified payin
  demoBuilder.createTx({
    valueDate: new Date('2017-12-30'),
    amount: 24500,
    note: 'Sógoromnak fizetem be mert elutazott Madridba',
    debit: [{
      account: demoBuilder.name2code('Assets', 'Folyószámla'),
    }],
  });


// ===== Transactions =====

// === Opening ===

  const openings = [
    ['Assets', 'Pénztár', 100000],
    ['Assets', 'Folyószámla', 110000],
    ['Assets', 'Megtakarítási számla', 120000],
  ];
  openings.forEach((opening) => {
    demoBuilder.createTx({
      valueDate: new Date('2017-01-01'),
      amount: opening[2],
      credit: [{
        account: demoBuilder.name2code('COA', 'Opening'),
      }],
      debit: [{
        account: demoBuilder.name2code(opening[0], opening[1]),
      }],
    });
  });

  // === Incomes ===

  demoBuilder.createTx({
    valueDate: new Date('2017-06-01'),
    amount: 3500,
    credit: [{
      account: demoBuilder.name2code('Incomes', 'Különféle egyéb bevételek'),
      localizer: demoBuilder.name2code('Localizer', 'Central'),
    }],
    debit: [{
      account: demoBuilder.name2code('Assets', 'Folyószámla'),
    }],
  });

  ['02', '04', '06', '08', '10', '12'].forEach(mm => {
    demoBuilder.createTx({
      valueDate: new Date(`2017-${mm}-01`),
      amount: 400,
      credit: [{
        account: demoBuilder.name2code('Incomes', 'Hitelintézettől kapott kamatok'),
        localizer: demoBuilder.name2code('Localizer', 'Central'),
      }],
      debit: [{
        account: demoBuilder.name2code('Assets', 'Folyószámla'),
      }],
    });
  });

  demoBuilder.createTx({
    valueDate: new Date('2017-09-15'),
    amount: 500000,
    credit: [{
      account: demoBuilder.name2code('Incomes', 'Támogatások'),
      localizer: demoBuilder.name2code('Localizer', 'Central'),
    }],
    debit: [{
      account: demoBuilder.name2code('Assets', 'Folyószámla'),
    }],
    note: __('demo.transactions.note.1'),
  });

  demoBuilder.createTx({
    valueDate: new Date('2017-05-10'),
    amount: 55000,
    credit: [{
      account: demoBuilder.name2code('Incomes', 'Bérleti díj bevételek'),
      localizer: demoBuilder.name2code('Localizer', 'Central'),
    }],
    debit: [{
      account: demoBuilder.name2code('Assets', 'Folyószámla'),
    }],
    note: __('demo.transactions.note.2'),
  });

  demoBuilder.createTx({
    valueDate: new Date('2017-10-15'),
    amount: 500000,
    credit: [{
      account: demoBuilder.name2code('Incomes', 'Különféle egyéb bevételek'),
      localizer: demoBuilder.name2code('Localizer', 'Central'),
    }],
    debit: [{
      account: demoBuilder.name2code('Assets', 'Folyószámla'),
    }],
    note: __('demo.transactions.note.3'),
  });

  demoBuilder.createTx({
    valueDate: new Date('2017-07-21'),
    amount: 2300000,
    credit: [{
      account: demoBuilder.name2code('Liabilities', 'Hosszú lejáratú bank hitel'),
    }],
    debit: [{
      account: demoBuilder.name2code('Assets', 'Megtakarítási számla'),
    }],
    note: __('demo.transactions.note.4'),
  });

  // == Expenses

  for (let mm = 1; mm < 13; mm++) {
    demoBuilder.createTx({
      valueDate: new Date('2017-' + mm + '-' + _.sample(['03', '04', '05', '06', '08', '10'])),
      amount: 80000 + Math.floor(Math.random() * 50000),
      credit: [{
        account: demoBuilder.name2code('Assets', 'Folyószámla'),
      }],
      debit: [{
        account: demoBuilder.name2code('Expenses', 'Víz díj'),
        localizer: demoBuilder.name2code('Localizer', 'Central'),
      }],
    });

    demoBuilder.createTx({
      valueDate: new Date('2017-' + mm + '-' + _.sample(['03', '04', '05', '06', '08', '10'])),
      amount: 98500,
      credit: [{
        account: demoBuilder.name2code('Assets', 'Folyószámla'),
      }],
      debit: [{
        account: demoBuilder.name2code('Expenses', 'Csatorna díjak'),
        localizer: demoBuilder.name2code('Localizer', 'Central'),
      }],
    });

    demoBuilder.createTx({
      valueDate: new Date('2017-' + mm + '-' + _.sample(['03', '04', '05', '06', '07', '08', '10'])),
      amount: 150000 + Math.floor(Math.random() * 50000),
      credit: [{
        account: demoBuilder.name2code('Assets', 'Folyószámla'),
      }],
      debit: [{
        account: demoBuilder.name2code('Expenses', 'Áram díj'),
        localizer: demoBuilder.name2code('Localizer', 'Central'),
      }],
    });
  }

  // == Bills

  ['03', '06', '09', '12'].forEach(mm => {
    demoBuilder.createTx({
      valueDate: new Date(`2017-${mm}-20`),
      amount: 282600,
      partner: 'Super-Clean Kft',
      credit: [{
        account: demoBuilder.name2code('Liabilities', 'Suppliers'),
      }],
      debit: [{
        account: demoBuilder.name2code('Expenses', 'Takarítás'),
      }],
    });

    if (mm !== '12') {  // Last bill is paid but not yet processed
      demoBuilder.createTx({
        valueDate: new Date(`2017-${mm}-25`),
        amount: 282600,
        partner: 'Super-Clean Kft',
        ref: `SC/2017/${mm}`,
        credit: [{
          account: demoBuilder.name2code('Assets', 'Folyószámla'),
        }],
        debit: [{
          account: demoBuilder.name2code('Liabilities', 'Suppliers'),
        }],
      });
    } else {
      demoBuilder.createTx({
        valueDate: new Date(`2017-${mm}-25`),
        amount: 282600,
        ref: `SC/2017/${mm}`,
        credit: [{
          account: demoBuilder.name2code('Assets', 'Folyószámla'),
        }],
      });
    }
  });
}

// ----------------------------------------------------------------
const DEMO_LIFETIME = moment.duration(2, 'hours').asMilliseconds();

function purgeDemoUserWithParcel(userId, parcelId, communityId) {
  debugAssert(userId && parcelId && communityId, `purgeDemoUserWithParcel parameter not defined ${userId} ${parcelId} ${communityId}`);
  // Purge user activity
  Topics.remove({ userId });
  Topics.remove({ 'participantIds.$': userId });
  Comments.remove({ userId });
  Delegations.remove({ sourcePersonId: userId });
  Delegations.remove({ targetPersonId: userId });
  // Purge votes
  const demoUserVote = 'voteCasts.' + userId;
  const demoUserVoteIndirect = 'voteCastsIndirect.' + userId;
  Topics.update({ [demoUserVote]: { $exists: true } },
    { $unset: { [demoUserVote]: 1 } }, { multi: true });
  const modifiedTopics = Topics.find({ [demoUserVoteIndirect]: { $exists: true } });
  if (Meteor.isServer) {
    modifiedTopics.forEach(topic => topic.voteEvaluate(false));
  }
  // Purge parcel
  const parcel = Parcels.findOne(parcelId);
  Memberships.remove({ parcelId }); // removing added benefactors as well
  Parcels.remove({ _id: parcelId });
  const currentTotalunits = Communities.findOne({ _id: communityId }).totalunits;
  if (currentTotalunits > 10000) {
    Communities.update({ _id: communityId }, { $set: { totalunits: (currentTotalunits - 100) } });
  }
  // Purge finacial records
  ParcelBillings.remove({ 'account.Localizer': parcel.ref });
  Transactions.remove({ 'entries.0.account.Localizer': parcel.ref });
  Breakdowns.update({ communityId, name: 'Parcels' }, {
    $pull: { children: { name: parcel.ref } },
  });

  Meteor.users.remove(userId);
}

Meteor.methods({
  createDemoUserWithParcel(lang) {
    check(lang, String);
    if (Meteor.isClient) return '';  // This should run only on the server side

    const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

    const demoHouse = Communities.findOne({ name: __('demo.house') });
    if (!demoHouse) throw new Meteor.Error('err_notImplemented', 'Demo house not available on this server');
    const demoCommunityId = demoHouse._id;
    const demoBuilder = new DemoCommunityBuilder(demoCommunityId, lang);
    const counter = demoBuilder.nextSerial;

    const demoParcelId = demoBuilder.createParcel({
      units: 100,
      floor: '5',
      door: counter.toString(),
      type: 'flat',
      area: 25,
    });
    const demoUserId = demoBuilder.createDemoUser(demoParcelId);
    const demoParcel = Parcels.findOne(demoParcelId);
    demoBuilder.createMembership(demoUserId, 'owner', {
      parcelId: demoParcelId,
      ownership: { share: new Fraction(1, 1) },
    });

    Localizer.addParcel(demoCommunityId, demoParcel, lang);

    const demoManagerId = demoBuilder.getUserWithRole('manager');
    const chatPartnerId = demoBuilder.getUserWithRole('owner');

    const demoUserMessageRoom = demoBuilder.create('room', {
      userId: demoUserId,
      participantIds: [demoUserId, demoManagerId],
    });
    demoBuilder.createComment({
      topicId: demoUserMessageRoom,
      userId: demoManagerId,
      text: __('demo.manager.message'),
    });
    const demoUserMessageRoom2 = demoBuilder.create('room', {
      userId: demoUserId,
      participantIds: [demoUserId, chatPartnerId],
    });
    Clock.setSimulatedTime(moment().subtract(6, 'hours').toDate());
    demoBuilder.createComment({
      topicId: demoUserMessageRoom2,
      userId: demoUserId,
      text: __('demo.messages.0'),
    });
    Clock.setSimulatedTime(moment().subtract(3, 'hours').toDate());
    demoBuilder.createComment({
      topicId: demoUserMessageRoom2,
      userId: chatPartnerId,
      text: __('demo.messages.1'),
    });
    Clock.clear();
    // lastSeens were updated in the comments.insert method,

    demoBuilder.generateDemoPayments(demoParcel);

    Meteor.setTimeout(function () {
      purgeDemoUserWithParcel(demoUserId, demoParcelId, demoCommunityId);
    }, DEMO_LIFETIME);

    const email = Meteor.users.findOne({ _id: demoUserId }).getPrimaryEmail();
    return email;
  },
});

export function purgeExpiringDemoUsers(lang, demoOrTest = 'demo') {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };
  const community = Communities.findOne({ name: __(`${demoOrTest}.house`) });
  if (!community) return;

  const communityId = community._id;
  const demoBuilder = new DemoCommunityBuilder(communityId, lang);
  demoBuilder.demoUsersList().forEach((user) => {
    const parcelId = demoBuilder.parcelIdOfDemoUser(user);
    const currentTime = moment().valueOf();
    let timeUntilDelete = moment(user.createdAt).add(DEMO_LIFETIME).subtract(currentTime).valueOf();
    if (timeUntilDelete < 0) timeUntilDelete = 0;
    Meteor.setTimeout(() => purgeDemoUserWithParcel(user._id, parcelId, communityId),
      timeUntilDelete);
  });
}
