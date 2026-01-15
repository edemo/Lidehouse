import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { defaultRoles } from '/imports/api/permissions/roles.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import '/imports/api/contracts/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/comments/methods.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Bills } from '/imports/api/accounting/bills/bills.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import '/imports/api/accounting/balances/methods.js';
import { ParcelBillings } from '/imports/api/accounting/parcel-billings/parcel-billings.js';
import '/imports/api/accounting/parcel-billings/methods.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import '/imports/api/accounting/statement-entries/methods.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { AccountingPeriods } from '/imports/api/accounting/periods/accounting-periods.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';
import { Clock } from '/imports/utils/clock';
import { CommunityBuilder, DemoCommunityBuilder } from './community-builder.js';
import { Txdefs } from '../api/accounting/txdefs/txdefs.js';

const statusChange = Topics.methods.statusChange;

export function insertDemoHouse(lang, demoOrTest) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

  const demoHouseName = __(`${demoOrTest}.house`);
  const demoHouse = Communities.findOne({ name: demoHouseName });

  if (demoHouse) {
    if (Meteor.settings.resetDemo) {
      Memberships.remove({ communityId: demoHouse._id, role: { $ne: 'admin' } });
      Communities.methods.remove._execute({ userId: demoHouse.admin() }, { _id: demoHouse._id });
    } else {
//      Balances.checkAllCorrect();
      return demoHouse._id;
    }
  }

  const templateId = Communities.findOne({ name: 'Honline Társasház Sablon', isTemplate: true })._id;

  Clock.AUTO_TICK = 1000; // one second pass after each Clock call - to avoid same timestamp on two things
  Clock.starts(2, 'year', 'ago');
  Log.info('Creating house:', demoHouseName);
  const communityId = Communities.insert({
    name: __(`${demoOrTest}.house`),
    zip: '1144',
    city: __('demo.city'),
    street: __('demo.street'),
    number: '86',
    lot: '4532/8',
    avatar: '/images/demohouse.jpg',
    taxNo: '128686-1-41',
    settings: {
      language: lang,
      modules: _.without(Communities.availableModules, 'marketplace'),
      ownershipScheme: 'condominium',
      parcelRefFormat: 'bfdd',
      templateId,
      accountingMethod: 'accrual',
      topicAgeDays: 365,
    },
  });

  const builder = new CommunityBuilder(communityId, demoOrTest, lang);

  if (Meteor.settings.resetDemo) {
    const email = `@${demoOrTest}.${builder.com}`;
    Log.info('Purging all demo users...');
    Meteor.users.remove({ 'emails.0.address': { $regex: email } });
  }

  const demoAdminId = builder.createLoginableUser('admin', {
    avatar: '/images/avatars/avatar21.jpg',
    'profile.phone': '06 60 762 7288',
  });
  const demoManagerId = builder.createLoginableUser('manager', {
    avatar: '/images/avatars/avatar20.jpg',
    'profile.phone': '06 60 555 4321',
  });

// ===== Parcels =====

  const demoParcels = [];
  demoParcels[0] = builder.createProperty({
    units: 489,
    floor: __('demo.groundCode'),
    door: '01',
    type: __('schemaParcels.type.flat'),
    area: 55,
    volume: 176,
  });
  demoParcels[1] = builder.createProperty({
    units: 427,
    floor: __('demo.groundCode'),
    door: '02',
    type: __('schemaParcels.type.flat'),
    area: 48,
    volume: 153.6,
  });
  demoParcels[2] = builder.createProperty({
    units: 587,
    floor: '1',
    door: '03',
    type: __('schemaParcels.type.flat'),
    area: 66,
    volume: 184.8,
  });
  demoParcels[3] = builder.createProperty({
    units: 622,
    floor: '1',
    door: '04',
    type: __('schemaParcels.type.flat'),
    area: 70,
    volume: 196,
  });
  demoParcels[4] = builder.createProperty({
    units: 587,
    floor: '2',
    door: '05',
    type: __('schemaParcels.type.flat'),
    area: 66,
    volume: 184.8,
  });
  demoParcels[5] = builder.createProperty({
    units: 622,
    floor: '2',
    door: '06',
    type: __('schemaParcels.type.flat'),
    area: 70,
    volume: 196,
  });
  demoParcels[6] = builder.createProperty({
    units: 587,
    floor: '3',
    door: '07',
    type: __('schemaParcels.type.flat'),
    area: 66,
    volume: 184.8,
  });
  demoParcels[7] = builder.createProperty({
    units: 622,
    floor: '3',
    door: '08',
    type: __('schemaParcels.type.flat'),
    area: 70,
    volume: 196,
  });
  demoParcels[8] = builder.createProperty({
    units: 587,
    floor: '4',
    door: '09',
    type: __('schemaParcels.type.flat'),
    area: 66,
    volume: 184.8,
  });
  demoParcels[9] = builder.createProperty({
    units: 622,
    floor: '4',
    door: '10',
    type: __('schemaParcels.type.flat'),
    area: 70,
    volume: 196,
  });
  demoParcels[10] = builder.createProperty({
    units: 996,
    floor: __('demo.atticCode'),
    door: '11',
    type: __('schemaParcels.type.flat'),
    area: 112,
    volume: 365,
  });
  demoParcels[11] = builder.createProperty({
    units: 444,
    floor: __('demo.cellarCode'),
    door: '01',
    type: __('schemaParcels.type.cellar'),
    area: 50,
  });
  demoParcels[12] = builder.createProperty({
    units: 613,
    floor: __('demo.cellarCode'),
    door: '02',
    type: __('schemaParcels.type.cellar'),
    area: 69,
  });
  demoParcels[13] = builder.createProperty({
    units: 196,
    floor: __('demo.groundCode'),
    door: '00',
    type: __('schemaParcels.type.shop'),
    area: 22,
  });

  // Meters
  demoParcels.forEach((parcelId, i) => {
    if (_.contains([0, 2, 3, 5, 6, 8, 9, 10, 11, 12], i)) {
      builder.create('meter', {
        parcelId,
        identifier: 'CW-000' + i,
        service: __('schemaMeters.service.coldWater'),
        uom: 'm3',
      });
    }
    if (i <= 10) {
      builder.create('meter', {
        parcelId,
        identifier: 'H-000' + i,
        service: __('schemaMeters.service.heating'),
        uom: 'kJ',
      });
    }
  });

  // ===== Non-loginable Dummy Users =====

  for (let userNo = 0; userNo < 18; userNo++) {
    const dummyUserId = builder.createDummyUser();
    switch (userNo) {
      case 2: builder.createMembership(dummyUserId, 'maintainer'); break;
      case 3: builder.createMembership(dummyUserId, 'accountant'); break;
      case 5: builder.createMembership(dummyUserId, 'treasurer'); break;
      case 4: builder.createMembership(dummyUserId, 'overseer', { rank: __('schemaMemberships.rank.chairman') }); break;
      case 10: builder.createMembership(dummyUserId, 'overseer'); break;
      case 16: builder.createMembership(dummyUserId, 'overseer'); break;
      default: break;
    }
  }
  const demoMaintainerId = builder.dummyUsers[2];
  const demoAccountantId = builder.dummyUsers[3];
  const dummyUserId = builder.dummyUsers[5];

  // ===== Ownerships =====

  [0, 1, 4, 5, 6, 7, 8, 9, 10, 12].forEach((parcelNo) => {
    builder.createMembership(parcelNo, 'owner', {
      parcelId: demoParcels[parcelNo],
      ownership: { share: new Fraction(1, 1) },
    });
  });
  builder.createMembership(5, 'owner', {
    parcelId: demoParcels[11],
    ownership: { share: new Fraction(1, 1) },
  });
  builder.createMembership(2, 'owner', {
    parcelId: demoParcels[2],
    ownership: {
      share: new Fraction(1, 2),
      representor: true,
    },
  });
  builder.createMembership(14, 'owner', {
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
    builder.createMembership(legalPerson, 'owner', {
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(1, 1),
      },
    });
    builder.createMembership(parcelNo, 'owner', {
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
    builder.createMembership(nonUserPerson, 'benefactor', {
      parcelId: demoParcels[parcelNo],
      benefactorship: { type: 'rental' },
    });
  });
  builder.createMembership(11, 'benefactor', {
    parcelId: demoParcels[4],
    benefactorship: { type: 'rental' },
  });
  builder.createMembership(15, 'benefactor', {
    parcelId: demoParcels[5],
    benefactorship: { type: 'favor' },
  });
  builder.createMembership(16, 'benefactor', {
    parcelId: demoParcels[8],
    benefactorship: { type: 'favor' },
  });
  builder.createMembership(17, 'benefactor', {
    parcelId: demoParcels[9],
    benefactorship: { type: 'rental' },
  });

  // Contracts
  demoParcels.forEach((parcelId, i) => {
    if (i === 11) {
      builder.create('memberContract', {
        parcelId,
        leadParcelId: demoParcels[5],
      });
    } else {
      const parcel = Parcels.findOne(parcelId);
      builder.create('memberContract', {
        parcelId,
        partnerId: parcel._payerMembership().partnerId,
        habitants: parcel.type === __('schemaParcels.type.flat') ? (i % 4) : undefined,
      });
    }
  });

  // ==== Loginable users with Roles =====

  if (demoOrTest === 'test') {
    defaultRoles.forEach((role) => {
      if (role.name === 'manager' || role.name === 'admin') return;

      const parcelId = Parcels.findOne({ communityId, serial: 7 })._id;
      let ownershipData;
      if (role.name === 'owner') {
        Memberships.update({ parcelId }, { $set: { role: 'owner', ownership: { share: new Fraction(1, 2), representor: false } } });
        ownershipData = { parcelId, ownership: { share: new Fraction(1, 2), representor: true } };
      } else if (role.name === 'benefactor') {
        ownershipData = { parcelId, benefactorship: { type: 'rental' } };
      }

      const firstNames = __('demo.user.firstNames').split('\n');
      builder.createLoginableUser(role.name, {
        avatar: '/images/avatars/avatarTestUser.png',
        profile: { lastName: __(role.name).capitalize(), firstName: _.sample(firstNames) },
      }, ownershipData);
    });
  }

  // ===== Breakdowns =====
  // Create breakdowns (incl Localizer)
  builder.execute(Transactions.methods.setAccountingTemplate, { communityId }, demoAccountantId);

/*
  builder.create('cashAccount', {
    digit: '1',
    name: __('Cash register'),
    primary: true,
  });
  builder.create('bankAccount', {
    digit: '2',
    name: __('demo.bank.primaryAccount.name'),
    BAN: __('demo.bank.primaryAccount.number'),
    sync: 'manual',
    primary: true,
  });
  builder.create('bankAccount', {
    digit: '3',
    name: __('demo.bank.savingsAccount.name'),
    BAN: __('demo.bank.savingsAccount.number'),
    sync: 'manual',
  });
*/
  Accounts.update({ communityId, category: 'bank', primary: true }, { $set: {
    BAN: __('17937621-00000000-51002312'),
  } });
  Accounts.update({ communityId, category: 'bank', primary: false }, { $set: {
    BAN: __('17937621-00000000-51002313'),
  } });

  // ===== Forum =====

  const thisYear = moment().year();
  const lastYear = moment().year() - 1;

  const demoTopicDates = [
    moment(`${lastYear}-09-16 08:25`).toDate(),
    moment().subtract(3, 'week').toDate(),
    moment().subtract(2, 'month').toDate(),
  ];

  ['0', '1', '2'].forEach((topicNo) => {
    Clock.setSimulatedTime(demoTopicDates[topicNo]);
    const topicId = builder.insert(Topics, 'forum', {
      title: __(`demo.topic.${topicNo}.title`),
      text: __(`demo.topic.${topicNo}.text`),
      status: 'opened',
    });

    ['0', '1', '2'].forEach((commentNo) => {
      Clock.tickSome('minutes');
      if (commentNo === '2') Clock.tickSome('days');
      const path = `demo.topic.${topicNo}.comment.${commentNo}`;
      const commentText = __(path);
      if (commentText !== path) {
        builder.insert(Comments, 'comment', {
          topicId,
          text: commentText,
          creatorId: (topicNo == 2 && commentNo == 2) ? null : undefined,
        });
      }
    });
  });
  Clock.clear();

  Clock.starts(3, 'days', 'ago');
  const epidemicTopicId = builder.insert(Topics, 'forum', {
    title: __('demo.topic.3.title'),
    text: __('demo.topic.3.text'),
    status: 'opened',
    creatorId: builder.dummyUsers[6]
  });
  ['0', '1', '2', '3'].forEach((commentNo) => {
    Clock.tickSome('minutes');
    if (commentNo === '3') Clock.tick(21, 'hours');
    const commentText = __(`demo.topic.3.comment.${commentNo}`);
    builder.insert(Comments, 'comment', {
      topicId: epidemicTopicId,
      text: commentText,
      creatorId: (commentNo == 2) ? builder.dummyUsers[6] : builder.dummyUsers[commentNo],
    });
  });
  Clock.clear();

  // ===== News =====

  Clock.starts(4, 'weeks', 'ago');
  ['0', '1', '3'].forEach((newsNo) => {
    Clock.tickSome('days');
    const newsId = builder.create('news', {
      title: __(`demo.news.${newsNo}.title`),
      text: __(`demo.news.${newsNo}.text`),
      status: 'opened',
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

  // ===== Room for test purpose =====

  const demoMessageRoom = builder.create('room', {
    creatorId: demoManagerId,
    participantIds: [demoAdminId, dummyUserId],
  });
  Clock.starts(1, 'weeks', 'ago');
  builder.insert(Comments, 'comment', {
    creatorId: demoAdminId,
    topicId: demoMessageRoom,
    text: __('demo.messages.0'),
  });
  Clock.tickSome('hours');
  builder.insert(Comments, 'comment', {
    creatorId: dummyUserId,
    topicId: demoMessageRoom,
    text: __('demo.messages.1'),
  });
  Clock.clear();

  // ===== Votes =====

  const agenda0 = builder.create('agenda', {
    title: `${__('demo.agenda.0.title')} ${lastYear}-III.`,
//    topicIds: [voteTopicLoan, voteTopicParking],
  });
  const agenda1 = builder.create('agenda', {
    title: `${__('demo.agenda.1.title')} ${thisYear}-I.`,
//    topicIds: [voteTopicBike, voteTopicWallColor, voteTopicManager],
  });

  const community = Communities.findOne(communityId);
  const voterships = _.sortBy(community.voterships(), v => v.createdAt);
  function castDemoVotes(topicId, votes) {
    votes.forEach((v, index) => {
      if (v) castVote._execute({ userId: voterships[index].userId }, { topicId, castedVote: v });
    });
  }

  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(1, 'weeks').toDate());
  const voteTopicLoan = builder.insert(Topics, 'vote', {
    title: __('demo.vote.loan.title'),
    text: __('demo.vote.loan.text'),
    agendaId: agenda0,
    status: 'opened',
    closesAt: moment(demoTopicDates[0]).add(6, 'weeks').toDate(),  // its past close date
    vote: {
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castDemoVotes(voteTopicLoan, [[1], [0], [2], [0], [0], [0], [2], [0], [0], [1]]);
  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(6, 'weeks').toDate());
  builder.execute(statusChange, { topicId: voteTopicLoan, status: 'votingFinished' });
  builder.execute(statusChange, { topicId: voteTopicLoan, status: 'closed' });
  Clock.clear();

  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(300, 'hours').toDate());
  const voteTopicParking = builder.insert(Topics, 'vote', {
    title: __('demo.vote.parking.title'),
    text: __('demo.vote.parking.text'),
    agendaId: agenda0,
    status: 'opened',
    closesAt: moment(demoTopicDates[0]).add(6, 'weeks').toDate(),
    vote: {
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castDemoVotes(voteTopicParking, [[0], [0], [0], [0], [0], [0], [0], [0], [1], [0], [0]]);
  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(6, 'weeks').toDate());
  builder.execute(statusChange, { topicId: voteTopicParking, status: 'votingFinished' });
  builder.execute(statusChange, { topicId: voteTopicParking, status: 'closed' });
  Clock.clear();

  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(2.5, 'months').toDate());
  const voteTopicCleaning = builder.insert(Topics, 'vote', {
    title: __('demo.vote.cleaning.title'),
    text: __('demo.vote.cleaning.text'),
    status: 'opened',
    closesAt: moment().add(1, 'months').toDate(),
    vote: {
      procedure: 'online',
      effect: 'poll',
      type: 'choose',
      choices: [
        __('demo.vote.cleaning.choice.0'),
        __('demo.vote.cleaning.choice.1'),
      ],
    },
  });

  castDemoVotes(voteTopicCleaning, [[0], [0], [0], [0], [0], [0], [0]]);
  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(15, 'weeks').toDate());
  builder.execute(statusChange, { topicId: voteTopicCleaning, status: 'votingFinished' });
  builder.execute(statusChange, { topicId: voteTopicCleaning, status: 'closed' });
  Clock.clear();

  Clock.starts(3, 'weeks', 'ago');
  const voteTopicWallColor = builder.insert(Topics, 'vote', {
    title: __('demo.vote.wallColor.title'),
    text: __('demo.vote.wallColor.text'),
    agendaId: agenda1,
    status: 'opened',
    closesAt: moment().add(2, 'month').toDate(),
    vote: {
      type: 'preferential',
      procedure: 'online',
      effect: 'poll',
      choices: [
        __('demo.vote.wallColor.choice.0'),
        __('demo.vote.wallColor.choice.1'),
        __('demo.vote.wallColor.choice.2'),
        __('demo.vote.wallColor.choice.3'),
      ],
    },
  });

  castDemoVotes(voteTopicWallColor, [null, [0, 1, 2, 3], null, [1, 2, 3, 0], null, [2, 3, 0, 1], null, [1, 0, 2, 3], null, [1, 2, 3, 0], null, [1, 2, 0, 3]]);
  ['0', '1'].forEach((commentNo) => {
    Clock.setSimulatedTime(moment().subtract(2, 'weeks').add(commentNo + 27, 'minutes').toDate());
    builder.insert(Comments, 'comment', {
      topicId: voteTopicWallColor,
      text: __(`demo.vote.wallColor.comment.${commentNo}`),
    });
  });
  Clock.clear();
  
  Clock.starts(2, 'weeks', 'ago');
  const voteTopicBike = builder.insert(Topics, 'vote', {
    title: __('demo.vote.bicycleStorage.title'),
    text: __('demo.vote.bicycleStorage.text'),
    agendaId: agenda1,
    status: 'opened',
    closesAt: moment().add(2, 'month').toDate(),
    vote: {
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castDemoVotes(voteTopicBike, [[0], [0], [0], [0], [1], [0], [0], [0]]);
  Clock.clear();

  Clock.starts(3, 'days', 'ago');
  const voteTopicEpidemicId = builder.insert(Topics, 'vote', {
    title: __('demo.vote.epidemic.title'),
    text: __('demo.vote.epidemic.text'),
    status: 'opened',
    closesAt: moment().add(1, 'month').toDate(),
    creatorId: demoManagerId,
    vote: {
      procedure: 'online',
      effect: 'poll',
      type: 'choose',
      choices: [
        __('demo.vote.epidemic.choice.0'),
        __('demo.vote.epidemic.choice.1'),
        __('demo.vote.epidemic.choice.2'),

      ],
    },
  });

  castDemoVotes(voteTopicEpidemicId, [[0], [1], [2], [0]]);
  ['0', '1', '2'].forEach((commentNo) => {
    Clock.tick(11, 'hours');
    Clock.tickSome('minutes');
    builder.insert(Comments, 'comment', {
      topicId: voteTopicEpidemicId,
      text: __(`demo.vote.epidemic.comment.${commentNo}`),
    });
  });
  Clock.clear();

  // ===== Shareddocs =====

  const serverFilePath = 'assets/app/demohouseDocs/';
  function getDemoFolderId(content) {
    const folder = Sharedfolders.findOne({ communityId: templateId, content });
    return folder._id;
  }

  builder.uploadShareddoc({
    file: serverFilePath + 'alaprajz.jpg',
    name: {
      en: 'Floorplan.jpg',
      hu: 'Alaprajz.jpg',
    },
    type: 'image/jpg',
    folder: getDemoFolderId('main'),
  });
  builder.uploadShareddoc({
    file: {
      en: serverFilePath + 'phone.xls',
      hu: serverFilePath + 'telefon.xls',
    },
    name: {
      en: 'Important_phone_numbers.xls',
      hu: 'Fontos_telefonszámok.xls',
    },
    type: 'application/vnd.ms-excel',
    folder: getDemoFolderId('main'),
  });
  builder.uploadShareddoc({
    file: {
      en: serverFilePath + 'act.pdf',
      hu: serverFilePath + 'tv.pdf',
    },
    name: {
      en: 'Act.pdf',
      hu: 'Társasházi_törvény.pdf',
    },
    type: 'application/pdf',
    folder: getDemoFolderId('main'),
  });
  builder.uploadShareddoc({
    file: {
      en: serverFilePath + 'bylaws.pdf',
      hu: serverFilePath + 'szmsz.pdf',
    },
    name: {
      en: 'ByLaws.pdf',
      hu: 'SZMSZ_201508.pdf',
    },
    type: 'application/pdf',
    folder: getDemoFolderId('community'),
  });
  builder.uploadShareddoc({
    file: serverFilePath + 'kerekpartarolo.jpg',
    name: {
      en: 'bikestorage.jpg',
      hu: 'kerekpartarolo.jpg',
    },
    type: 'image/jpg',
    folder: getDemoFolderId('voting'),
    topicId: voteTopicBike,
  });

  // ===== Tickets =====

  Clock.starts(3, 'month', 'ago');
  const supplier0 = builder.create('supplier', {
    idCard: {
      type: 'legal',
      name: __('demo.contract.0.partner'),
    },
  });
  const supplier1 = builder.create('supplier', {
    idCard: {
      type: 'legal',
      name: __('demo.contract.1.partner'),
    },
  });
  const supplier2 = builder.create('supplier', {
    idCard: {
      type: 'legal',
      name: __('demo.contract.2.partner'),
    },
  });
  const customer0 = builder.create('customer', {
    idCard: {
      type: 'legal',
      name: __('demo.contract.10.partner'),
    },
  });

  const contract0 = builder.create('contract', {
    title: __('demo.contract.0.title'),
    text: __('demo.contract.0.text'),
    relation: 'supplier',
    partnerId: supplier0,
  });
  const contract1 = builder.create('contract', {
    title: __('demo.contract.1.title'),
    text: __('demo.contract.1.text'),
    relation: 'supplier',
    partnerId: supplier1,
  });
  const contract2 = builder.create('contract', {
    title: __('demo.contract.2.title'),
    text: __('demo.contract.2.text'),
    relation: 'supplier',
    partnerId: supplier2,
  });
  const contract10 = builder.create('contract', {
    title: __('demo.contract.10.title'),
    text: __('demo.contract.10.text'),
    relation: 'customer',
    partnerId: customer0,
  });

  [1, 2, 3, 4].forEach(m => {
    Clock.tick(1, 'month');
    const maintainanceDate = moment(Clock.currentDate());
    const ticket = builder.create('ticket', {
      title: __('demo.contract.1.ticketTitle') + ' ' + maintainanceDate.format('YYYY MMM'),
      text: __('demo.contract.1.ticketText'),
      status: 'scheduled',
      ticket: {
        type: 'maintenance',
        urgency: 'normal',
        localizer: Parcels.findOneT({ communityId, name: 'Lift' }),
        chargeType: 'lumpsum',
        contractId: contract1,
        expectedStart: maintainanceDate.toDate(),
        expectedFinish: maintainanceDate.toDate(),
      },
    });
    if (m <= 2) {
      builder.execute(statusChange, { topicId: ticket, status: 'progressing', dataUpdate: {} });
      builder.execute(statusChange, { topicId: ticket, status: 'finished',
        dataUpdate: {
          actualStart: maintainanceDate.toDate(),
          actualFinish: maintainanceDate.toDate(),
        },
      });
    }
  });

  Clock.starts(1, 'week', 'ago');
//  builder.nextUser(); // just to skip the maintainer
  const ticket0 = builder.insert(Topics, 'ticket', {
    title: __('demo.ticket.lift.title'),
    text: __('demo.ticket.lift.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'high',
    },
  });
  Clock.tickSome('minutes');
  builder.execute(statusChange, { topicId: ticket0, status: 'confirmed',
    text: __('demo.ticket.lift.comment.0'),
    dataUpdate: {
      localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Lift' }),
      chargeType: 'lumpsum',
      contractId: contract1,
      expectedStart: Clock.date(1, 'days', 'ahead'),
      expectedFinish: Clock.date(2, 'days', 'ahead'),
    },
  });
  Clock.tick(6, 'days');
  builder.execute(statusChange, { topicId: ticket0, status: 'progressing',
    text: __('demo.ticket.lift.comment.1'),
    dataUpdate: { expectedFinish: Clock.date(3, 'days', 'ahead') },
  });

  Clock.starts(5, 'weeks', 'ago');
  Clock.tickSome('minutes');
  const ticket1 = builder.insert(Topics, 'ticket', {
    title: __('demo.ticket.leak.title'),
    text: __('demo.ticket.leak.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'normal',
    },
  });
  Clock.tickSome('minutes');
  builder.execute(statusChange, { topicId: ticket1, status: 'confirmed',
    text: __('demo.ticket.leak.comment.0'),
    dataUpdate: {
      localizer: '@A409',
      chargeType: 'insurance',
      expectedStart: Clock.date(3, 'days', 'ahead'),
      expectedFinish: Clock.date(4, 'days', 'ahead'),
    },
  });
  const actualStart1 = Clock.tick(2, 'days');
  builder.execute(statusChange, { topicId: ticket1, status: 'progressing',
    text: __('demo.ticket.leak.comment.1'),
    dataUpdate: { expectedFinish: Clock.date(3, 'days', 'ahead') },
  });
  Clock.tickSome('minutes');
  const actualFinish1 = Clock.tick(2, 'days');
  builder.execute(statusChange, { topicId: ticket1, status: 'finished',
    text: __('demo.ticket.leak.comment.2'),
    dataUpdate: {
      actualStart: actualStart1,
      actualFinish: actualFinish1,
    },
  });
  Clock.tick(2, 'days');
  builder.execute(statusChange, { topicId: ticket1, status: 'closed',
    text: __('demo.ticket.leak.comment.3'),
    dataUpdate: {},
  });

  Clock.starts(3, 'weeks', 'ago');
  Clock.tickSome('hours');
  const ticket2 = builder.insert(Topics, 'ticket', {
    title: __('demo.ticket.blackout.title'),
    text: __('demo.ticket.blackout.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'normal',
    },
  });
  Clock.tickSome('minutes');
  builder.insert(Comments, 'comment', {
    topicId: ticket2,
    text: __('demo.ticket.blackout.comment.0'),
  });

  Clock.starts(3, 'months', 'ago');
  Clock.tickSome('minutes');
  const ticket3 = builder.insert(Topics, 'ticket', {
    title: __('demo.ticket.plaster.title'),
    text: __('demo.ticket.plaster.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'low',
    },
  });
  Clock.tickSome('hours');
  builder.execute(statusChange, { topicId: ticket3, status: 'confirmed',
    text: __('demo.ticket.plaster.comment.0'),
    dataUpdate: {
      localizer: Parcels.findOneT({ communityId, category: 'location', name: 'Lépcsőház' }),
      chargeType: 'oneoff',
      contractId: contract0,
      expectedCost: 10000,
      expectedStart: Clock.date(1, 'week', 'ahead'),
      expectedFinish: Clock.date(2, 'week', 'ahead'),
    },
  });
  const actualStart3 = Clock.tick(1, 'week');
  builder.execute(statusChange, { topicId: ticket3, status: 'progressing',
    text: __('demo.ticket.plaster.comment.1'),
    dataUpdate: {
      expectedFinish: Clock.date(10, 'day', 'ahead'),
    },
  });
  Clock.tickSome('minutes');
  const actualFinish3 = Clock.tick(8, 'day');
  builder.execute(statusChange, { topicId: ticket3, status: 'finished',
    text: __('demo.ticket.plaster.comment.2'),
    dataUpdate: {
      actualCost: 8500,
      actualStart: actualStart3,
      actualFinish: actualFinish3,
    },
  });
  Clock.tickSome('hours');
  builder.insert(Comments, 'comment', {
    topicId: ticket3,
    text: __('demo.ticket.plaster.comment.3'),
  });
  Clock.tickSome('minutes');
  builder.execute(statusChange, { topicId: ticket3, status: 'closed',
    text: __('demo.ticket.plaster.comment.4'),
    dataUpdate: {},
  });

  Clock.clear();

  // ===== Accounting =====


  // === Parcel Billings ===

  const parcelBillingIds = [];

  parcelBillingIds.push(builder.insert(ParcelBillings, '', {
    title: 'Közös költség előírás',
    projection: {
      base: 'area',
      unitPrice: 300,
    },
    digit: Accounts.findPayinDigitByName('Közös költség előírás'),
    localizer: '@',
  }));

  parcelBillingIds.push(builder.insert(ParcelBillings, '', {
    title: 'Hidegvíz előírás',
    consumption: {
      service: __('schemaMeters.service.coldWater'),
      charges: [{
        uom: 'm3',
        unitPrice: 650,
      }],
    },
    projection: {
      base: 'habitants',
      unitPrice: 2500,
    },
    digit: Accounts.findPayinDigitByName('Hidegvíz előírás'),
    type: [__('schemaParcels.type.flat')],
    localizer: '@',
  }));

  parcelBillingIds.push(builder.insert(ParcelBillings, '', {
    title: 'Fűtési díj előírás',
    consumption: {
      service: __('schemaMeters.service.heating'),
      charges: [{
        uom: 'kJ',
        unitPrice: 120,
      }],
    },
    projection: {
      base: 'volume',
      unitPrice: 75,
    },
    digit: Accounts.findPayinDigitByName('Fűtési díj előírás'),
    type: [__('schemaParcels.type.flat')],
    localizer: '@',
  }));

  // This is a one-time, extraordinary parcel billing
  builder.insert(ParcelBillings, '', {
    title: 'Rendkivüli befizetés előírás',
    projection: {
      base: 'absolute',
      unitPrice: 75000,
    },
    digit: Accounts.findPayinDigitByName('Rendkivüli befizetés előírás'),
    type: ['flat', 'shop'],
    localizer: '@',
    notes: __('demo.transactions.notes.0'),
    activeTime: {
      begin: Date.newUTC(`${lastYear}-08-01`),
      end: Date.newUTC(`${lastYear}-08-31`),
    },
  });

  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(mm => {
    Clock.setSimulatedTime(Date.newUTC(`${lastYear}-${mm}-12`));
    builder.execute(ParcelBillings.methods.apply, { communityId, date: Clock.currentDate() });
  });

  // === Owner Payins ===
  builder.everybodyPaysTheirBills();

  // Some unpaid bills (so we can show the parcels that are in debt)
  Clock.setSimulatedTime(Date.newUTC(`${lastYear}-12-20`));
  const extraBillingId = builder.insert(ParcelBillings, '', {
    title: 'Rendkivüli befizetés előírás',
    projection: {
      base: 'area',
      unitPrice: 200,
    },
    digit: Accounts.findPayinDigitByName('Rendkivüli befizetés előírás'),
    localizer: '@',
    activeTime: {
      begin: Date.newUTC(`${lastYear}-12-01`),
      end: Date.newUTC(`${lastYear}-12-31`),
    },
  });
  builder.execute(ParcelBillings.methods.apply, { communityId, ids: [extraBillingId], date: Date.newUTC(`${lastYear}-12-20`) });

  // Unidentified payin
  builder.create('statementEntry', {
    account: Accounts.findOneT({ communityId, category: 'bank', name: 'Checking account' }).code,
    valueDate: Date.newUTC(`${lastYear}-12-30`),
    amount: 24500,
    name: 'Gipsz Jakab',
    note: 'Sógoromnak fizetem be mert elutazott Madridba',
  });

  Clock.clear();

// ===== Transactions =====

// === Opening ===

  const openings = [
    ['cash', 'Cash register', 300000],
    ['bank', 'Checking account', 3100000],
    ['bank', 'Savings account', 1400000],
    ['bank', 'LTP', 100000],
  ];
  const debit = [];
  openings.forEach(o => debit.push({
    account: Accounts.findOneT({ communityId, category: o[0], name: o[1] }).code,
    amount: o[2],
  }));
  builder.create('opening', {
    valueDate: Date.newUTC(`${lastYear}-01-01`),
    debit,
  });

  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(mm => {
    builder.create('transfer', {
      defId: Txdefs.getByName('Money transfer', communityId)._id,
      valueDate: Date.newUTC(`${lastYear}-${mm}-01`),
      amount: 100000,
      fromAccount: '`382',
      toAccount: '`384',
    });
  });

  // == Bills

  ['03', '06', '09', '12'].forEach(mm => {
    const billId = builder.create('bill', {
      relation: 'supplier',
      issueDate: Date.newUTC(`${lastYear}-${mm}-15`),
      deliveryDate: Date.newUTC(`${lastYear}-${mm}-05`),
      dueDate: Date.newUTC(`${lastYear}-${mm}-30`),
      // amount: 282600,
      partnerId: supplier2,
      contractId: contract2,
      relationAccount: '`454',
      lines: [{
        title: 'Épület takarítás',
        uom: 'hónap',
        quantity: 3,
        unitPrice: 94200,
        account: Accounts.getByName('Épület takarítás', communityId).code,
        localizer: '@',
      }],
    });

    if (mm !== '12') {  // Last bill is not yet paid, and not yet sent to accounting
      builder.execute(Transactions.methods.post, { _id: billId });
      builder.create('payment', {
        relation: 'supplier',
        bills: [{ id: billId, amount: 282600 }],
        amount: 282600,
        valueDate: Date.newUTC(`${lastYear}-${mm}-25`),
        partnerId: supplier2,
        relationAccount: '`454',
        payAccount: Accounts.getByName('Checking account', communityId).code,
      });
    }
  });

  // An Invoice, half paid
  const invoiceId = builder.create('bill', {
    relation: 'customer',
    issueDate: Date.newUTC(`${lastYear}-06-15`),
    deliveryDate: Date.newUTC(`${lastYear}-06-30`),
    dueDate: Date.newUTC(`${lastYear}-06-30`),
    partnerId: customer0,
    contractId: contract10,
    relationAccount: '`31',
    lines: [{
      title: 'Reklámfelület bérleti díj',
      uom: 'year',
      quantity: 1,
      unitPrice: 50200,
      account: Accounts.getByName('Különféle egyéb bevételek', communityId).code,
      localizer: '@',
    }],
  });
  builder.execute(Transactions.methods.post, { _id: invoiceId });
  builder.create('payment', {
    relation: 'customer',
    bills: [{ id: invoiceId, amount: 25000 }],
    amount: 25000,
    valueDate: Date.newUTC(`${lastYear}-06-25`),
    partnerId: customer0,
    payAccount: Accounts.getByName('Checking account', communityId).code,
  });

  // === Incomes ===

  const partnerStudio = builder.create('customer', {
    idCard: {
      type: 'legal',
      name: '21st CDF Studio',
    },
  });

  const partnerBank = builder.create('customer', {
    idCard: {
      type: 'legal',
      name: 'TMSBank',
    },
  });

  const partnerCustomer = builder.create('customer', {
    idCard: {
      type: 'legal',
      name: 'AB General',
    },
  });

  const partnerKozmu = builder.create('supplier', {
    idCard: {
      type: 'legal',
      name: 'KÖZMÜ Zrt',
    },
  });

  builder.create('income', {
    partnerId: partnerStudio,
    valueDate: Date.newUTC(`${lastYear}-06-01`),
    lines: [{
      title: 'Forgatási bérleti díj',
      uom: 'db',
      quantity: 1,
      unitPrice: 35000,
      account: Accounts.getByName('Különféle egyéb bevételek', communityId).code,
//      localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
    }],
    payAccount: Accounts.getByName('Checking account', communityId).code,
  });

  ['02', '04', '06', '08', '10', '12'].forEach(mm => {
    builder.create('income', {
      partnerId: partnerBank,
      valueDate: Date.newUTC(`${lastYear}-${mm}-01`),
      lines: [{
        title: 'Banki kamat',
        uom: 'hó',
        quantity: 1,
        unitPrice: 400,
        account: Accounts.getByName('Hitelintézettől kapott kamatok', communityId).code,
//        localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
      }],
      payAccount: Accounts.getByName('Checking account', communityId).code,
    });
  });

  builder.create('income', {
    partnerId: partnerBank,
    valueDate: Date.newUTC(`${lastYear}-09-15`),
    lines: [{
      title: 'Állami támogatás tetőfelújításra',
      uom: 'db',
      quantity: 1,
      unitPrice: 600000,
      account: Accounts.getByName('Támogatások', communityId).code,
//      localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
    }],
    payAccount: Accounts.getByName('Checking account', communityId).code,
    notes: __('demo.transactions.notes.1'),
  });

  builder.create('income', {
    partnerId: customer0,
    valueDate: Date.newUTC(`${lastYear}-05-10`),
    lines: [{
      title: 'Antenna hely bérleti díj',
      uom: 'év',
      quantity: 1,
      unitPrice: 155000,
      account: Accounts.getByName('Bérleti díj bevételek', communityId).code,
//      localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
    }],
    payAccount: Accounts.getByName('Checking account', communityId).code,
    notes: __('demo.transactions.notes.2'),
  });

  builder.create('income', {
    partnerId: partnerCustomer,
    valueDate: Date.newUTC(`${lastYear}-10-15`),
    lines: [{
      title: '???',
      uom: '?',
      quantity: 1,
      unitPrice: 500000,
      account: Accounts.getByName('Különféle egyéb bevételek', communityId).code,
//      localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
    }],
    payAccount: Accounts.getByName('Checking account', communityId).code,
    notes: __('demo.transactions.notes.3'),
  });

  builder.create('income', {
    partnerId: partnerBank,
    valueDate: Date.newUTC(`${lastYear}-07-21`),
    lines: [{
      title: 'Banki hitel',
      uom: 'db',
      quantity: 1,
      unitPrice: 3500000,
      account: Accounts.getByName('Hosszú lejáratú bank hitel', communityId).code,
    }],
    payAccount: Accounts.getByName('Savings account', communityId).code,
    notes: __('demo.transactions.notes.4'),
  });

  // == Expenses
  builder.create('expense', {
    partnerId: supplier0,
    valueDate: Date.newUTC(`${lastYear}-01-10`),
    lines: [{
      title: 'Kazán',
      uom: 'db',
      quantity: 2,
      unitPrice: 495000,
      account: Accounts.getByName('Műszaki berendezések', communityId).code,
//      localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Heating system' }).code,
    }],
    payAccount: Accounts.getByName('Checking account', communityId).code,
  });

  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(mm => {
    builder.create('expense', {
      partnerId: partnerKozmu,
      valueDate: Date.newUTC(`${lastYear}-${mm}-${_.sample(['03', '04', '05', '06', '08', '10'])}`),
      lines: [{
        title: 'Víz fogyasztás',
        uom: 'm3',
        quantity: 100 + Math.floor(Math.random() * 70),
        unitPrice: 800,
        account: Accounts.getByName('Víz díj', communityId).code,
//        localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
      }],
      payAccount: Accounts.getByName('Checking account', communityId).code,
    });

    builder.create('expense', {
      partnerId: partnerKozmu,
      valueDate: Date.newUTC(`${lastYear}-${mm}-${_.sample(['03', '04', '05', '06', '08', '10'])}`),
      lines: [{
        title: 'Csatorna díj',
        uom: 'hó',
        quantity: 1,
        unitPrice: 98500,
        account: Accounts.getByName('Csatorna díj', communityId).code,
//        localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
      }],
      payAccount: Accounts.getByName('Checking account', communityId).code,
    });

    builder.create('expense', {
      partnerId: partnerKozmu,
      valueDate: Date.newUTC(`${lastYear}-${mm}-${_.sample(['03', '04', '05', '06', '07', '08', '10'])}`),
      lines: [{
        title: 'Áram fogyasztás',
        uom: 'mért',
        quantity: 1,
        unitPrice: 150000 + Math.floor(Math.random() * 50000),
        account: Accounts.getByName('Áram díj', communityId).code,
//        localizer: Accounts.findOneT({ communityId, category: 'location', name: 'Central' }).code,
      }],
      payAccount: Accounts.getByName('Checking account', communityId).code,
    });
  });

  builder.postAllTransactions();
  Clock.clear();

  if (Meteor.settings.public.fakeMembersNr && demoOrTest === 'test' && lang === 'en') {
    builder.insertLoadsOfFakeMembers(Meteor.settings.public.fakeMembersNr, true);
    builder.postAllTransactions();
  }

  return communityId;
}

// ----------------------------------------------------------------
const DEMO_LIFETIME = moment.duration(2, 'hours').asMilliseconds();

function purgeDemoUserWithParcel(userId, parcelId, communityId) {
  debugAssert(userId && parcelId && communityId, `purgeDemoUserWithParcel parameter not defined ${userId} ${parcelId} ${communityId}`);
  const user = Meteor.users.findOne(userId);
  const partnerId = user.partnerId(communityId);
  // Purge user activity
  Topics.remove({ creatorId: userId });
  Topics.remove({ 'participantIds.$': userId });
  Comments.remove({ creatorId: userId });
  Delegations.remove({ sourceId: user.partnerId(communityId) });
  Delegations.remove({ targetId: user.partnerId(communityId) });
  // Purge votes
  const demoUserVote = 'voteCasts.' + userId;
  const demoUserVoteIndirect = 'voteCastsIndirect.' + userId;
  Topics.update({ [demoUserVote]: { $exists: true } },
    { $unset: { [demoUserVote]: 1 } }, { multi: true, selector: { category: 'vote' } });
  const modifiedTopics = Topics.find({ [demoUserVoteIndirect]: { $exists: true } });
  if (Meteor.isServer) {
    modifiedTopics.forEach(topic => topic.voteEvaluate());
  }
  // Purge finacial records
  Transactions.remove({ partnerId, category: 'payment' }); // needs the bills
  Transactions.remove({ partnerId });
  // Purge parcel/membership/partner
  Memberships.remove({ partnerId });
  Memberships.remove({ parcelId }); // removing added benefactors as well
  Contracts.remove({ partnerId });
  Parcels.remove({ _id: parcelId });
  Partners.remove({ userId });
  Meteor.users.remove(userId);
}

let createDemoUserLock = false; // The clock manipualtion in this method has to be protected with a Lock

Meteor.methods({
  createDemoUserWithParcel(lang) {
    if (!createDemoUserLock) {
      try {
        createDemoUserLock = true;
        check(lang, String);
        if (Meteor.isClient) return '';  // This should run only on the server side

        const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

        const demoHouse = Communities.findOne({ name: __('demo.house') });
        if (!demoHouse) throw new Meteor.Error('err_notImplemented', 'Demo house not available on this server');
        const communityId = demoHouse._id;
        const builder = new DemoCommunityBuilder(communityId, lang);
        const counter = builder.nextSerial;

        const demoParcelId = builder.createProperty({
          units: 100,
          floor: '5',
          door: counter.toString(),
          type: __('schemaParcels.type.flat'),
          area: 25,
        });
        const demoUserId = builder.createDemoUser(demoParcelId);
        const demoParcel = Parcels.findOne(demoParcelId);
        const demoMembershipId = builder.createMembership(demoUserId, 'owner', {
          parcelId: demoParcelId,
          ownership: { share: new Fraction(1, 1) },
        });
        builder.createMembership(demoUserId, 'overseer');
        const demoMembership = Memberships.findOne(demoMembershipId);

        Clock.starts(2, 'year', 'ago');
        const waterMeterId = builder.create('meter', { identifier: 'W-' + demoParcelId, parcelId: demoParcelId, service: __('schemaMeters.service.coldWater'), uom: 'm3' });
        const heatingMeterId = builder.create('meter', { identifier: 'H-' + demoParcelId, parcelId: demoParcelId, service: __('schemaMeters.service.heating'), uom: 'kJ' });
        Clock.starts(14, 'month', 'ago');
        builder.execute(Meters.methods.registerReading, { _id: waterMeterId,
          reading: { date: Clock.currentTime(), value: 5 } });
        builder.execute(Meters.methods.registerReading, { _id: heatingMeterId,
          reading: { date: Clock.currentTime(), value: 3 } });
        Clock.tick(1, 'month');
        builder.execute(Meters.methods.registerReading, { _id: waterMeterId,
          reading: { date: Clock.currentTime(), value: 25 } });
        builder.execute(Meters.methods.registerReading, { _id: heatingMeterId,
          reading: { date: Clock.currentTime(), value: 33 } });
        Clock.clear();
        // Billings will be applied startig from a year ago, for each month

        const demoManagerId = builder.getUserWithRole('manager');

        const demoUserMessageRoom = builder.create('room', {
          creatorId: demoUserId,
          participantIds: [demoUserId, demoManagerId],
        });
        builder.insert(Comments, 'comment', {
          creatorId: demoManagerId,
          topicId: demoUserMessageRoom,
          text: __('demo.manager.message'),
        });
        // lastSeens were updated in the comments.insert method,

        builder.generateDemoPayments(demoParcel, demoMembership, 3);
        const toPost = Transactions.find({ communityId, partnerId: demoMembership.partnerId, postedAt: { $exists: false } });
        builder.execute(Transactions.methods.batch.post, { args: toPost.map(t => ({ _id: t._id })) }, builder.getUserWithRole('accountant'));

        Meteor.setTimeout(function () {
          purgeDemoUserWithParcel(demoUserId, demoParcelId, communityId);
        }, DEMO_LIFETIME);

        const email = Meteor.users.findOne({ _id: demoUserId }).getPrimaryEmail();
        return email;
      } finally {
        createDemoUserLock = false;
      }
    } else {
      throw new Meteor.Error('err_notAvailable', 'Server is busy, please try again in a few seconds');
    }
  },
});

export function schedulePurgeExpiringDemoUsers(lang, demoOrTest = 'demo', demoLifetime = DEMO_LIFETIME) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };
  const community = Communities.findOne({ name: __(`${demoOrTest}.house`) });
  if (!community) return;

  const communityId = community._id;
  const builder = new DemoCommunityBuilder(communityId, lang);
  builder.demoUsersList().forEach((user) => {
    const parcelId = builder.parcelIdOfDemoUser(user);
    const currentTime = moment().valueOf();
    let timeUntilDelete = moment(user.createdAt).add(demoLifetime).subtract(currentTime).valueOf();
    if (timeUntilDelete < 0) timeUntilDelete = 0;
    Meteor.setTimeout(() => purgeDemoUserWithParcel(user._id, parcelId, communityId),
      timeUntilDelete);
  });
}
