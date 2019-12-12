import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { defaultRoles } from '/imports/api/permissions/roles.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import '/imports/api/contracts/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/comments/methods.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import '/imports/api/transactions/balances/methods.js';
import '/imports/api/transactions/breakdowns/methods.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import '/imports/api/transactions/parcel-billings/methods.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import '/imports/api/transactions/statement-entries/methods.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';
import { Clock } from '/imports/utils/clock';
import { CommunityBuilder, DemoCommunityBuilder } from './community-builder.js';

const statusChange = Topics.methods.statusChange;

export function insertDemoHouse(lang, demoOrTest) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

  const demoHouseName = __(`${demoOrTest}.house`);
  const demoHouse = Communities.findOne({ name: demoHouseName });

  if (demoHouse) {
    if (Meteor.settings.reset) {
      Communities.remove(demoHouse._id);
    } else {
//      Balances.checkAllCorrect();
      return;
    }
  }

  Clock.starts(6, 'month', 'ago');
  console.log('Creating house:', demoHouseName);
  const demoCommunityId = Communities.insert({
    name: __(`${demoOrTest}.house`),
    zip: '1144',
    city: __('demo.city'),
    street: __('demo.street'),
    number: '86',
    lot: '4532/8',
    avatar: '/images/demohouse.jpg',
    taxNumber: '128686-1-41',
    totalunits: 10000,
    settings: {
      accountingMethod: 'accrual',
      topicAgeDays: 365,
    },
    bankAccounts: [{
      name: __('demo.bank.primaryAccount.name'),
      accountNumber: __('demo.bank.primaryAccount.number'),
      primary: true,
    }, {
      name: __('demo.bank.savingsAccount.name'),
      accountNumber: __('demo.bank.savingsAccount.number'),
    }],
  });

  const demoBuilder = new CommunityBuilder(demoCommunityId, demoOrTest, lang);

  const demoAdminId = demoBuilder.createLoginableUser('admin', {
    avatar: '/images/avatars/avatar21.jpg',
    'profile.phone': '06 60 762 7288',
  });
  const demoManagerId = demoBuilder.createLoginableUser('manager', {
    avatar: '/images/avatars/avatar20.jpg',
    'profile.phone': '06 60 555 4321',
  });

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
  });
  demoParcels[1] = demoBuilder.createParcel({
    units: 427,
    floor: __('demo.groundCode'),
    door: '02',
    type: 'flat',
    area: 48,
    volume: 153.6,
    habitants: 2,
  });
  demoParcels[2] = demoBuilder.createParcel({
    units: 587,
    floor: '1',
    door: '03',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 3,
  });
  demoParcels[3] = demoBuilder.createParcel({
    units: 622,
    floor: '1',
    door: '04',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 1,
  });
  demoParcels[4] = demoBuilder.createParcel({
    units: 587,
    floor: '2',
    door: '05',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 3,
  });
  demoParcels[5] = demoBuilder.createParcel({
    units: 622,
    floor: '2',
    door: '06',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 4,
  });
  demoParcels[6] = demoBuilder.createParcel({
    units: 587,
    floor: '3',
    door: '07',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 2,
  });
  demoParcels[7] = demoBuilder.createParcel({
    units: 622,
    floor: '3',
    door: '08',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 2,
  });
  demoParcels[8] = demoBuilder.createParcel({
    units: 587,
    floor: '4',
    door: '09',
    type: 'flat',
    area: 66,
    volume: 184.8,
    habitants: 2,
  });
  demoParcels[9] = demoBuilder.createParcel({
    units: 622,
    floor: '4',
    door: '10',
    type: 'flat',
    area: 70,
    volume: 196,
    habitants: 3,
  });
  demoParcels[10] = demoBuilder.createParcel({
    units: 996,
    floor: __('demo.atticCode'),
    door: '11',
    type: 'flat',
    area: 112,
    habitants: 5,
  });
  demoParcels[11] = demoBuilder.createParcel({
    units: 444,
    floor: __('demo.cellarCode'),
    door: '01',
    type: 'cellar',
    area: 50,
    habitants: 1,
  });
  demoParcels[12] = demoBuilder.createParcel({
    units: 613,
    floor: __('demo.cellarCode'),
    door: '02',
    type: 'cellar',
    area: 69,
    habitants: 1,
  });
  demoParcels[13] = demoBuilder.createParcel({
    units: 196,
    floor: __('demo.groundCode'),
    door: '00',
    type: 'shop',
    area: 22,
    habitants: 1,
  });


  // Meters
  demoParcels.forEach((parcelId, i) => {
    if (_.contains([0, 2, 3, 5, 6, 8, 9, 10, 11, 12], i)) {
      demoBuilder.create('meter', {
        parcelId,
        service: 'coldWater',
      });
    }
    if (i <= 10) {
      demoBuilder.create('meter', {
        parcelId,
        service: 'heating',
      });
    }
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

  demoBuilder.create('leadership', {
    parcelId: demoParcels[11],
    leadRef: 'A206',
    leadParcelId: demoParcels[5],
  });

  // ==== Loginable users with Roles =====

  if (demoOrTest === 'test') {
    defaultRoles.forEach((role) => {
      if (role.name === 'manager' || role.name === 'admin') return;

      const parcelId = Parcels.findOne({ communityId: demoCommunityId, serial: 7 })._id;
      let ownershipData;
      if (role.name === 'owner') {
        Memberships.update({ parcelId }, { $set: { role: 'owner', ownership: { share: new Fraction(1, 2), representor: false } } });
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

  // ===== Breakdowns =====
  // Create breakdowns (incl Localizer)
  demoBuilder.execute(Transactions.methods.cloneAccountingTemplates, { communityId: demoCommunityId }, demoAccountantId);

  // ===== Forum =====

  const thisYear = moment().year();
  const lastYear = moment().year() - 1;

  const demoTopicDates = [
    moment(`${lastYear}-09-16 08:25`).toDate(),
    moment().subtract(4, 'month').toDate(),
    moment().subtract(3, 'week').toDate(),,
  ];

  ['0', '1', '2'].forEach((topicNo) => {
    Clock.setSimulatedTime(demoTopicDates[topicNo]);
    const topicId = demoBuilder.insert(Topics, 'forum', {
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
        demoBuilder.insert(Comments, 'comment', {
          topicId,
          text: commentText,
          creatorId: (topicNo == 2 && commentNo == 2) ? null : undefined,
        });
      }
    });
  });
  Clock.clear();

  // ===== News =====

  Clock.starts(2, 'weeks', 'ago');
  ['0', '1'].forEach((newsNo) => {
    Clock.tickSome('days');
    const newsId = demoBuilder.create('news', {
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

  // ===== Votes =====

  const agenda0 = demoBuilder.create('agenda', {
    title: `${__('demo.agenda.0.title')} ${lastYear}-III.`,
//    topicIds: [voteTopicLoan, voteTopicParking],
  });
  const agenda1 = demoBuilder.create('agenda', {
    title: `${__('demo.agenda.1.title')} ${thisYear}-I.`,
//    topicIds: [voteTopicBike, voteTopicWallColor, voteTopicManager],
  });

  const ownerships = Memberships.findActive({ communityId: demoCommunityId, role: 'owner', 'person.userId': { $exists: true } }).fetch();
  function castDemoVotes(topicId, votes) {
    votes.forEach((v, index) => {
      if (v) castVote._execute({ userId: ownerships[index].person.userId }, { topicId, castedVote: v });
    });
  }

  Clock.setSimulatedTime(moment(demoTopicDates[0]).subtract(2, 'months').toDate());
  const voteTopicManager = demoBuilder.insert(Topics, 'vote', {
    title: __('demo.vote.manager.title'),
    text: __('demo.vote.manager.text'),
    status: 'opened',
    closesAt: moment(demoTopicDates[0]).subtract(1, 'months').toDate(),
    vote: {
      procedure: 'online',
      effect: 'poll',
      type: 'petition',
    },
  });
  castDemoVotes(voteTopicManager, [[0], null, [0], [0], [0], [0], [0]]);
  Clock.setSimulatedTime(moment(demoTopicDates[0]).subtract(1, 'months').toDate());
  demoBuilder.execute(statusChange, { topicId: voteTopicManager, status: 'votingFinished' });
  demoBuilder.execute(statusChange, { topicId: voteTopicManager, status: 'closed' });
  Clock.clear();

  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(2, 'weeks').toDate());
  const voteTopicLoan = demoBuilder.insert(Topics, 'vote', {
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

  castDemoVotes(voteTopicLoan, [[1], [0], [2], [0], [0], [0], [2], [0], [0], [1], [0], [0], [0]]);
  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(6, 'weeks').toDate());
  demoBuilder.execute(statusChange, { topicId: voteTopicLoan, status: 'votingFinished' });
  demoBuilder.execute(statusChange, { topicId: voteTopicLoan, status: 'closed' });
  Clock.clear();
  
  Clock.setSimulatedTime(moment(demoTopicDates[0]).add(142, 'hours').toDate());
  const voteTopicParking = demoBuilder.insert(Topics, 'vote', {
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
  demoBuilder.execute(statusChange, { topicId: voteTopicParking, status: 'votingFinished' });
  demoBuilder.execute(statusChange, { topicId: voteTopicParking, status: 'closed' });
  Clock.clear();

  Clock.starts(3, 'weeks', 'ago');
  const voteTopicWallColor = demoBuilder.insert(Topics, 'vote', {
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
    Clock.setSimulatedTime(moment().subtract(3, 'days').add(commentNo + 2, 'minutes').toDate());
    demoBuilder.insert(Comments, 'comment', {
      topicId: voteTopicWallColor,
      text: __(`demo.vote.wallColor.comment.${commentNo}`),
    });
  });
  Clock.clear();
  
  Clock.starts(10, 'days', 'ago');
  const voteTopicCleaning = demoBuilder.insert(Topics, 'vote', {
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
  // No one voted on this yet

  Clock.starts(1, 'weeks', 'ago');
  const voteTopicBike = demoBuilder.insert(Topics, 'vote', {
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

  Clock.starts(3, 'month', 'ago');
  const supplier0 = demoBuilder.create('supplier', {
    name: __('demo.contract.0.partner'),
  });
  const supplier1 = demoBuilder.create('supplier', {
    name: __('demo.contract.1.partner'),
  });
  const supplier2 = demoBuilder.create('supplier', {
    name: __('demo.contract.2.partner'),
  });
  const customer0 = demoBuilder.create('customer', {
    name: __('demo.contract.10.partner'),
  });

  const contract0 = demoBuilder.create('contract', {
    title: __('demo.contract.0.title'),
    text: __('demo.contract.0.text'),
    partnerId: supplier0,
  });
  const contract1 = demoBuilder.create('contract', {
    title: __('demo.contract.1.title'),
    text: __('demo.contract.1.text'),
    partnerId: supplier1,
  });
  const contract2 = demoBuilder.create('contract', {
    title: __('demo.contract.2.title'),
    text: __('demo.contract.2.text'),
    partnerId: supplier2,
  });
  const contract10 = demoBuilder.create('contract', {
    title: __('demo.contract.10.title'),
    text: __('demo.contract.10.text'),
    partnerId: customer0,
  });

  [1, 2, 3, 4].forEach(m => {
    Clock.tick(1, 'month');
    const maintainanceDate = moment(Clock.currentDate());
    const ticket = demoBuilder.create('ticket', {
      title: __('demo.contract.1.ticketTitle') + ' ' + maintainanceDate.format('YYYY MMM'),
      text: __('demo.contract.1.ticketText'),
      status: 'scheduled',
      ticket: {
        type: 'maintenance',
        urgency: 'normal',
        localizer: demoBuilder.name2code('Localizer', 'Lift'),
        chargeType: 'lumpsum',
        contractId: contract1,
        expectedStart: maintainanceDate.toDate(),
        expectedFinish: maintainanceDate.toDate(),
      },
    });
    if (m <= 2) {
      demoBuilder.execute(statusChange, { topicId: ticket, status: 'progressing', dataUpdate: {} });
      demoBuilder.execute(statusChange, { topicId: ticket, status: 'finished',
        dataUpdate: {
          actualStart: maintainanceDate.toDate(),
          actualFinish: maintainanceDate.toDate(),
        },
      });
    }
  });

  Clock.starts(1, 'week', 'ago');
//  demoBuilder.nextUser(); // just to skip the maintainer
  const ticket0 = demoBuilder.insert(Topics, 'ticket', {
    title: __('demo.ticket.0.title'),
    text: __('demo.ticket.0.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'high',
    },
  });
  Clock.tickSome('minutes');
  demoBuilder.execute(statusChange, { topicId: ticket0, status: 'confirmed',
    text: __('demo.ticket.0.comment.0'),
    dataUpdate: {
      localizer: demoBuilder.name2code('Localizer', 'Lift'),
      chargeType: 'lumpsum',
      contractId: contract1,
      expectedStart: Clock.date(1, 'days', 'ahead'),
      expectedFinish: Clock.date(2, 'days', 'ahead'),
    },
  });
  Clock.tick(6, 'days');
  demoBuilder.execute(statusChange, { topicId: ticket0, status: 'progressing',
    text: __('demo.ticket.0.comment.1'),
    dataUpdate: { expectedFinish: Clock.date(3, 'days', 'ahead') },
  });

  Clock.starts(3, 'weeks', 'ago');
  const ticket1 = demoBuilder.insert(Topics, 'ticket', {
    title: __('demo.ticket.1.title'),
    text: __('demo.ticket.1.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'normal',
    },
  });
  Clock.tickSome('minutes');
  demoBuilder.execute(statusChange, { topicId: ticket1, status: 'confirmed',
    text: __('demo.ticket.1.comment.0'),
    dataUpdate: {
      localizer: '@A409',
      chargeType: 'insurance',
      expectedStart: Clock.date(3, 'days', 'ahead'),
      expectedFinish: Clock.date(4, 'days', 'ahead'),
    },
  });
  const actualStart1 = Clock.tick(2, 'days');
  demoBuilder.execute(statusChange, { topicId: ticket1, status: 'progressing',
    text: __('demo.ticket.1.comment.1'),
    dataUpdate: { expectedFinish: Clock.date(3, 'days', 'ahead') },
  });
  Clock.tickSome('minutes');
  const actualFinish1 = Clock.tick(2, 'days');
  demoBuilder.execute(statusChange, { topicId: ticket1, status: 'finished',
    text: __('demo.ticket.1.comment.2'),
    dataUpdate: {
      actualStart: actualStart1,
      actualFinish: actualFinish1,
    },
  });
  Clock.tick(2, 'days');
  demoBuilder.execute(statusChange, { topicId: ticket1, status: 'closed',
    text: __('demo.ticket.1.comment.3'),
    dataUpdate: {},
  });

  Clock.starts(2, 'weeks', 'ago');
  const ticket2 = demoBuilder.insert(Topics, 'ticket', {
    title: __('demo.ticket.2.title'),
    text: __('demo.ticket.2.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'normal',
    },
  });
  Clock.tickSome('minutes');
  demoBuilder.insert(Comments, 'comment', {
    topicId: ticket2,
    text: __('demo.ticket.2.comment.0'),
  });

  Clock.starts(3, 'months', 'ago');
  const ticket3 = demoBuilder.insert(Topics, 'ticket', {
    title: __('demo.ticket.3.title'),
    text: __('demo.ticket.3.text'),
    status: 'reported',
    ticket: {
      type: 'issue',
      urgency: 'low',
    },
  });
  Clock.tickSome('hours');
  demoBuilder.execute(statusChange, { topicId: ticket3, status: 'confirmed',
    text: __('demo.ticket.3.comment.0'),
    dataUpdate: {
      localizer: demoBuilder.name2code('Localizer', 'Lépcsőház'),
      chargeType: 'oneoff',
      contractId: contract0,
      expectedCost: 10000,
      expectedStart: Clock.date(1, 'week', 'ahead'),
      expectedFinish: Clock.date(2, 'week', 'ahead'),
    },
  });
  const actualStart3 = Clock.tick(1, 'week');
  demoBuilder.execute(statusChange, { topicId: ticket3, status: 'progressing',
    text: __('demo.ticket.3.comment.1'),
    dataUpdate: {
      expectedFinish: Clock.date(10, 'day', 'ahead'),
    },
  });
  Clock.tickSome('minutes');
  const actualFinish3 = Clock.tick(8, 'day');
  demoBuilder.execute(statusChange, { topicId: ticket3, status: 'finished',
    text: __('demo.ticket.3.comment.2'),
    dataUpdate: {
      actualCost: 8500,
      actualStart: actualStart3,
      actualFinish: actualFinish3,
    },
  });
  Clock.tickSome('hours');
  demoBuilder.insert(Comments, 'comment', {
    topicId: ticket3,
    text: __('demo.ticket.3.comment.3'),
  });
  Clock.tickSome('minutes');
  demoBuilder.execute(statusChange, { topicId: ticket3, status: 'closed',
    text: __('demo.ticket.3.comment.4'),
    dataUpdate: {},
  });

  Clock.clear();

  // ===== Accounting =====


  // === Parcel Billings ===

  const parcelBillingIds = [];

  parcelBillingIds.push(demoBuilder.insert(ParcelBillings, '', {
    title: 'Közös költség előírás',
    projection: 'area',
    projectedPrice: 275,
    payinType: demoBuilder.name2code('Owner payin types', 'Közös költség előírás'),
    localizer: '@',
  }));

  parcelBillingIds.push(demoBuilder.insert(ParcelBillings, '', {
    title: 'Hidegvíz előírás',
    consumption: 'coldWater',
    uom: 'm3',
    unitPrice: 650,
    projection: 'habitants',
    projectedPrice: 2500,
    payinType: demoBuilder.name2code('Owner payin types', 'Hidegvíz előírás'),
    localizer: '@A',
  }));

  parcelBillingIds.push(demoBuilder.insert(ParcelBillings, '', {
    title: 'Fűtési díj előírás',
    consumption: 'heating',
    uom: 'kJ',
    unitPrice: 120,
    projection: 'volume',
    projectedPrice: 75,
    payinType: demoBuilder.name2code('Owner payin types', 'Fűtési díj előírás'),
    localizer: '@A',
  }));

  // This is a one-time, extraordinary parcel billing
  demoBuilder.insert(ParcelBillings, '', {
    title: 'Rendkivüli befizetés előírás',
    projection: 'absolute',
    projectedPrice: 75000,
    payinType: demoBuilder.name2code('Owner payin types', 'Rendkivüli befizetés előírás'),
    localizer: '@',
    note: __('demo.transactions.note.0'),
    activeTime: {
      begin: new Date(`${lastYear}-08-01`),
      end: new Date(`${lastYear}-08-31`),
    },
  });

  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(mm => {
    Clock.setSimulatedTime(new Date(`${lastYear}-${mm}-12`));
    demoBuilder.execute(ParcelBillings.methods.apply, { communityId: demoCommunityId, date: Clock.currentDate() });
  });

  // === Owner Payins ===
  demoBuilder.everybodyPaysTheirBills();

  // Some unpaid bills (so we can show the parcels that are in debt)
  Clock.setSimulatedTime(new Date(`${lastYear}-12-20`));
  const extraBillingId = demoBuilder.insert(ParcelBillings, '', {
    title: 'Rendkivüli befizetés előírás',
    projection: 'area',
    projectedPrice: 200,
    payinType: demoBuilder.name2code('Owner payin types', 'Rendkivüli befizetés előírás'),
    localizer: '@',
    activeTime: {
      begin: new Date(`${lastYear}-12-01`),
      end: new Date(`${lastYear}-12-31`),
    },
  });
  demoBuilder.execute(ParcelBillings.methods.apply, { communityId: demoCommunityId, ids: [extraBillingId], date: new Date(`${lastYear}-12-20`) });

  // Unidentified payin
  demoBuilder.create('statementEntry', {
    account: demoBuilder.name2code('Assets', 'Folyószámla'),
    valueDate: new Date(`${lastYear}-12-30`),
    amount: 24500,
    partner: 'Gipsz Jakab',
    note: 'Sógoromnak fizetem be mert elutazott Madridba',
  });

  Clock.clear();

// ===== Transactions =====

// === Opening ===

  const openings = [
    ['Assets', 'Pénztár', 100000],
    ['Assets', 'Folyószámla', 110000],
    ['Assets', 'Megtakarítási számla', 120000],
  ];
  openings.forEach((opening) => {
    demoBuilder.insert(Transactions, 'transaction', {
      valueDate: new Date(`${lastYear}-01-01`),
      amount: opening[2],
      credit: [{
        account: demoBuilder.name2code('COA', 'Opening'),
      }],
      debit: [{
        account: demoBuilder.name2code(opening[0], opening[1]),
      }],
    });
  });

  // == Bills

  ['03', '06', '09', '12'].forEach(mm => {
    const billId = demoBuilder.create('bill', {
      relation: 'supplier',
      valueDate: new Date(`${lastYear}-${mm}-20`),
      // amount: 282600,
      partnerId: supplier2,
      contractId: contract2,
      lines: [{
        title: 'Épület takarítás',
        uom: 'hónap',
        quantity: 3,
        unitPrice: 94200,
        account: demoBuilder.name2code('Expenses', 'Takarítás'),
        localizer: '@',
      }],
    });

    if (mm !== '12') {  // Last bill is not yet paid, and not yet sent to accounting
      demoBuilder.execute(Transactions.methods.post, { _id: billId });
      demoBuilder.create('payment', {
        relation: 'supplier',
        billId,
        valueDate: new Date(`${lastYear}-${mm}-25`),
        amount: 282600,
        partnerId: supplier2,
        payAccount: demoBuilder.name2code('Assets', 'Folyószámla'),
      });
    }
  });

  // An Invoice, half paid
  const invoiceId = demoBuilder.create('bill', {
    relation: 'customer',
    valueDate: new Date(`${lastYear}-03-15`),
    partnerId: customer0,
    contractId: contract10,
    lines: [{
      title: 'Reklámfelület bérleti díj',
      uom: 'year',
      quantity: 1,
      unitPrice: 50200,
      account: demoBuilder.name2code('Incomes', 'Különféle egyéb bevételek'),
      localizer: '@',
    }],
  });
  demoBuilder.execute(Transactions.methods.post, { _id: invoiceId });
  demoBuilder.create('payment', {
    relation: 'customer',
    billId: invoiceId,
    valueDate: new Date(`${lastYear}-03-25`),
    amount: 25000,
    partnerId: customer0,
    payAccount: demoBuilder.name2code('Assets', 'Folyószámla'),
  });

  // === Incomes ===

  demoBuilder.insert(Transactions, 'transaction', {
    valueDate: new Date(`${lastYear}-06-01`),
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
    demoBuilder.insert(Transactions, 'transaction', {
      valueDate: new Date(`${lastYear}-${mm}-01`),
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

  demoBuilder.insert(Transactions, 'transaction', {
    valueDate: new Date(`${lastYear}-09-15`),
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

  demoBuilder.insert(Transactions, 'transaction', {
    valueDate: new Date(`${lastYear}-05-10`),
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

  demoBuilder.insert(Transactions, 'transaction', {
    valueDate: new Date(`${lastYear}-10-15`),
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

  demoBuilder.insert(Transactions, 'transaction', {
    valueDate: new Date(`${lastYear}-07-21`),
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
    demoBuilder.insert(Transactions, 'transaction', {
      valueDate: new Date(`${lastYear}-${mm}-${_.sample(['03', '04', '05', '06', '08', '10'])}`),
      amount: 80000 + Math.floor(Math.random() * 50000),
      credit: [{
        account: demoBuilder.name2code('Assets', 'Folyószámla'),
      }],
      debit: [{
        account: demoBuilder.name2code('Expenses', 'Víz díj'),
        localizer: demoBuilder.name2code('Localizer', 'Central'),
      }],
    });

    demoBuilder.insert(Transactions, 'transaction', {
      valueDate: new Date(`${lastYear}-${mm}-${_.sample(['03', '04', '05', '06', '08', '10'])}`),
      amount: 98500,
      credit: [{
        account: demoBuilder.name2code('Assets', 'Folyószámla'),
      }],
      debit: [{
        account: demoBuilder.name2code('Expenses', 'Csatorna díjak'),
        localizer: demoBuilder.name2code('Localizer', 'Central'),
      }],
    });

    demoBuilder.insert(Transactions, 'transaction', {
      valueDate: new Date(`${lastYear}-${mm}-${_.sample(['03', '04', '05', '06', '07', '08', '10'])}`),
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

  Balances.methods.publish._execute({ userId: demoAccountantId }, { communityId: demoCommunityId });
  Clock.clear();
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
  // TODO Transactions.remove({ 'entries.0.account.Localizer': parcel.ref });
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
    const demoMembershipId = demoBuilder.createMembership(demoUserId, 'owner', {
      parcelId: demoParcelId,
      ownership: { share: new Fraction(1, 1) },
    });
    const demoMembership = Memberships.findOne(demoMembershipId);

    Localizer.addParcel(demoCommunityId, demoParcel, lang);

    const demoManagerId = demoBuilder.getUserWithRole('manager');
    const chatPartnerId = demoBuilder.getUserWithRole('owner');

    const demoUserMessageRoom = demoBuilder.create('room', {
      userId: demoUserId,
      participantIds: [demoUserId, demoManagerId],
    });
    demoBuilder.insert(Comments, 'comment', {
      topicId: demoUserMessageRoom,
      creatorId: demoManagerId,
      text: __('demo.manager.message'),
    });
    const demoUserMessageRoom2 = demoBuilder.create('room', {
      userId: demoUserId,
      participantIds: [demoUserId, chatPartnerId],
    });
    Clock.setSimulatedTime(moment().subtract(6, 'hours').toDate());
    demoBuilder.insert(Comments, 'comment', {
      topicId: demoUserMessageRoom2,
      creatorId: demoUserId,
      text: __('demo.messages.0'),
    });
    Clock.setSimulatedTime(moment().subtract(3, 'hours').toDate());
    demoBuilder.insert(Comments, 'comment', {
      topicId: demoUserMessageRoom2,
      creatorId: chatPartnerId,
      text: __('demo.messages.1'),
    });
    Clock.clear();
    // lastSeens were updated in the comments.insert method,

    demoBuilder.generateDemoPayments(demoParcel, demoMembership);

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
