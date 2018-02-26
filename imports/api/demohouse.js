import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';

import { Accounts } from 'meteor/accounts-base';
import { Communities } from '/imports/api/communities/communities.js';
import { update as updateCommunity } from '/imports/api/communities/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { defaultRoles } from '/imports/api/permissions/config.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { ParcelBillings } from '/imports/api/payments/parcel-billings/parcel-billings.js';
import { insert as insertParcelBilling } from '/imports/api/payments/parcel-billings/methods.js';
import { insertPayAccountTemplate } from '/imports/api/payaccounts/template.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';


export function insertDemoHouse(lang) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

  // if Demo house data already populated, no need to do anything
  if (Communities.findOne({ name: __('demo.house') })) {
    return;
  }

  // ===== Communities =====

  const demoCommunityId = Communities.insert({
    name: __('demo.house'),
    zip: '1144',
    city: __('demo.city'),
    street: __('demo.street'),
    number: '86',
    lot: '4532/8',
    avatar: 'images/demohouse.jpg',
    totalunits: 12000,
  });

// ===== Parcels =====

  const demoParcels = [];
  demoParcels[0] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 1,
    units: 604,
    floor: __('demo.ground'),
    number: '1',
    type: 'flat',
    lot: '4532/8/A/1',
    area: 55,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[1] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 2,
    units: 527,
    floor: __('demo.ground'),
    number: '2',
    type: 'flat',
    lot: '4532/8/A/2',
    area: 48,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[2] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 3,
    units: 724,
    floor: 'I',
    number: '3',
    type: 'flat',
    lot: '4532/8/A/3',
    area: 66,
    habitants: 2,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[3] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 4,
    units: 768,
    floor: 'I',
    number: '4',
    type: 'flat',
    lot: '4532/8/A/4',
    area: 70,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[4] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 5,
    units: 724,
    floor: 'II',
    number: '5',
    type: 'flat',
    lot: '4532/8/A/5',
    area: 66,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[5] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 6,
    units: 768,
    floor: 'II',
    number: '6',
    type: 'flat',
    lot: '4532/8/A/6',
    area: 70,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[6] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 7,
    units: 724,
    floor: 'III',
    number: '7',
    type: 'flat',
    lot: '4532/8/A/7',
    area: 66,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[7] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 8,
    units: 768,
    floor: 'III',
    number: '8',
    type: 'flat',
    lot: '4532/8/A/8',
    area: 70,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[8] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 9,
    units: 724,
    floor: 'IV',
    number: '9',
    type: 'flat',
    lot: '4532/8/A/9',
    area: 66,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[9] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 10,
    units: 768,
    floor: 'IV',
    number: '10',
    type: 'flat',
    lot: '4532/8/A/10',
    area: 70,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[10] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 11,
    units: 1229,
    floor: __('demo.attic'),
    number: '11',
    type: 'flat',
    lot: '4532/8/A/5',
    area: 66,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[11] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 12,
    units: 549,
    floor: __('demo.cellar'),
    number: '1',
    type: 'cellar',
    lot: '4532/8/A/12',
    area: 50,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[12] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 13,
    units: 878,
    floor: __('demo.cellar'),
    number: '2',
    type: 'cellar',
    lot: '4532/8/A/13',
    area: 80,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[13] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 14,
    units: 241,
    floor: __('demo.ground'),
    number: '',
    type: 'shop',
    lot: '4532/8/A/14',
    area: 22,
    waterMetered: false,
    heatingType: 'ownHeating',
  });

  // ===== Demo Users with Roles =====

  // You can log in to try the different roles
  // will be removed from production
  const com = { en: 'com', hu: 'hu' }[lang];
  defaultRoles.forEach(function (role) {
    const boyNames = __('demo.user.boyNames').split('\n');
    const girlNames = __('demo.user.girlNames').split('\n');
    const firstNames = boyNames.concat(girlNames);
    const avatarBoys = ['http://www.mycustomer.com/sites/all/themes/pp/img/default-user.png',
      'http://pannako.hu/wp-content/uploads/avatar-1.png',
      'http://pannako.hu/wp-content/uploads/avatar-2.png',
      'http://pannako.hu/wp-content/uploads/avatar-5.png',
      'http://pannako.hu/wp-content/uploads/avatar-7.png'];
    const avatarGirls = ['http://www.mycustomer.com/sites/all/themes/pp/img/default-user.png',
      'http://pannako.hu/wp-content/uploads/avatar-3.png',
      'http://pannako.hu/wp-content/uploads/avatar-4.png',
      'http://pannako.hu/wp-content/uploads/avatar-6.png',
      'http://pannako.hu/wp-content/uploads/avatar-8.png'];
    const userWithRoleId = Accounts.createUser({ email: role.name + `@demo.${com}`, password: 'password',
      profile: { lastName: role.name.charAt(0).toUpperCase() + role.name.slice(1), firstName: _.sample(firstNames) } });
    const user = Meteor.users.findOne(userWithRoleId);
    if (boyNames.includes(user.profile.firstName)) {
      Meteor.users.update({ _id: userWithRoleId }, { $set: { 'emails.0.verified': true, avatar: _.sample(avatarBoys), 'settings.language': lang } });
    } else {
      Meteor.users.update({ _id: userWithRoleId }, { $set: { 'emails.0.verified': true, avatar: _.sample(avatarGirls), 'settings.language': lang } });
    }
    if (role.name === 'owner') {
      return;
    } else if (role.name === 'benefactor') {
      Memberships.insert({ communityId: demoCommunityId, userId: userWithRoleId, role: role.name,
        parcelId: demoParcels[10], benefactorship: { type: 'rental' } });
    } else {
      Memberships.insert({ communityId: demoCommunityId, userId: userWithRoleId, role: role.name });
    }
  });

  // ===== Demo Users =====

  const demoUsers = [];
  for (userNo = 0; userNo < 18; userNo++) {
    demoUsers.push(Meteor.users.insert({
      emails: [{ address: `user.${userNo}@demo.${com}`, verified: true }],
      profile: { lastName: __(`demo.user.${userNo}.lastName`), firstName: __(`demo.user.${userNo}.firstName`) },
      avatar: `images/avatars/avatar${userNo}.jpg`,
    }));
  }
  const demoManagerId = Meteor.users.insert({
    emails: [{ address: `user.manager@demo.${com}`, verified: true }],
    profile: { lastName: __('demo.user.manager.lastName'), firstName: __('demo.user.manager.firstName'), phone: '06 30 234 5678' },
    avatar: 'images/avatars/avatar20.jpg',
  });
  //  status: 'online',    status: 'standby',
  const demoUserId = demoUsers[5];
  const demoAdminId = demoUsers[10];

  // ===== Memberships =====

  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoManagerId,
    role: 'manager',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoAdminId,
    role: 'admin',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[3],
    role: 'accountant',
  });
  [0, 1, 4, 5, 6, 7, 8, 9, 10, 12].forEach((parcelNo) => {
    Memberships.insert({
      communityId: demoCommunityId,
      userId: demoUsers[parcelNo],
      role: 'owner',
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(1, 1),
      },
    });
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[5],
    role: 'owner',
    parcelId: demoParcels[11],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[2],
    role: 'owner',
    parcelId: demoParcels[2],
    ownership: {
      share: new Fraction(1, 2),
      representor: true,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[14],
    role: 'owner',
    parcelId: demoParcels[2],
    ownership: {
      share: new Fraction(1, 2),
      representor: false,
    },
  });
  [3, 13].forEach((parcelNo) => {
    Memberships.insert({
      communityId: demoCommunityId,
      // no userId -- This parcel is owned by a legal entity, and the representor for them is user[]
      idCard: {
        type: 'legal',
        name: __(`demo.user.${parcelNo}.company.name`),
        address: __(`demo.user.${parcelNo}.company.address`),
        identifier: __(`demo.user.${parcelNo}.company.regno`),
      },
      role: 'owner',
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(1, 1),
      },
    });
    Memberships.insert({
      communityId: demoCommunityId,
      userId: demoUsers[parcelNo],
      role: 'owner',
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(0),
        representor: true,
      },
    });
  });
  [1, 7].forEach((parcelNo) => { Memberships.insert({
    communityId: demoCommunityId,
    // no userId -- This person is benefactor of parcel[], but she is not a registered user of the app
    idCard: {
      type: 'person',
      name: __(`demo.user.${parcelNo}.benefactor.name`),
      address: __(`demo.user.${parcelNo}.benefactor.address`),
      identifier: `${parcelNo}87201NA`,
      dob: new Date(1965, `${parcelNo}`, 5),
      mothersName: __(`demo.user.${parcelNo}.benefactor.mothersName`),
    },
    role: 'benefactor',
    parcelId: demoParcels[parcelNo],
    benefactorship: {
      type: 'rental',
    },
    });
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[11],
    role: 'benefactor',
    parcelId: demoParcels[4], 
    benefactorship: {
      type: 'rental',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[15],
    role: 'benefactor',
    parcelId: demoParcels[5], 
    benefactorship: {
      type: 'favor',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[16],
    role: 'benefactor',
    parcelId: demoParcels[8], 
    benefactorship: {
      type: 'favor',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUsers[17],
    role: 'benefactor',
    parcelId: demoParcels[9], 
    benefactorship: {
      type: 'rental',
    },
  });

  // ===== Forum =====

  // The demo users comment one after the other, round robin style
  let nextUserIndex = 1;
  function sameUser() {
    return demoUsers[nextUserIndex];
  }
  function nextUser() {
    nextUserIndex += 7; // relative prime
    nextUserIndex %= demoUsers.length;
    return demoUsers[nextUserIndex];
  }

  ['0', '1', '2'].forEach((topicNo) => {
    const topicId = Topics.insert({
      communityId: demoCommunityId,
      userId: nextUser(),
      category: 'forum',
      title: __(`demo.topic.${topicNo}.title`),
      text: __(`demo.topic.${topicNo}.text`),
    });

    ['0', '1', '2'].forEach((commentNo) => {
      const path = `demo.topic.${topicNo}.comment.${commentNo}`;
      const commentText = __(path);
      if (commentText !== path) {
        Comments.insert({
          topicId,
          userId: (topicNo == 2 && commentNo == 2) ? sameUser() : nextUser(),
          text: commentText,
        });
      }
    });
  });

  // ===== News =====

  ['0', '1', '2'].forEach((newsNo) => {
    const newsId = Topics.insert({
      communityId: demoCommunityId,
      userId: demoUsers[0],
      category: 'news',
      title: __(`demo.news.${newsNo}.title`),
      text: __(`demo.news.${newsNo}.text`),
    });

    if (newsNo == 2) {
      Topics.update(newsId, {
        $set: {
          text: 'Doctor: <span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +36 (1) 345-562 <br>' +
                'Polizei: <small class="text-alt">07</small> <br>' +
                'Information: <small class="text-alt"><span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +3630 6545621' +
                ' / <span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> baltazar.imre@demo.com</small>',
          sticky: true,
        },
      });
    }
  });

  // ===== Votes =====

  const ownerships = Memberships.find({ communityId: demoCommunityId, role: 'owner', userId: { $exists: true } }).fetch();

  const voteTopic0 = Topics.insert({
    communityId: demoCommunityId,
    userId: demoUserId,
    category: 'vote',
    title: __('demo.vote.0.title'),
    text: __('demo.vote.0.text'),
    vote: {
      closesAt: moment().subtract(10, 'day').toDate(),  // its past close date
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castVote._execute({ userId: ownerships[0].userId }, { topicId: voteTopic0, castedVote: [1] }); // no
  castVote._execute({ userId: ownerships[1].userId }, { topicId: voteTopic0, castedVote: [0] }); // yes
  castVote._execute({ userId: ownerships[2].userId }, { topicId: voteTopic0, castedVote: [2] }); // abstain
  castVote._execute({ userId: ownerships[3].userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[4].userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[5].userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[6].userId }, { topicId: voteTopic0, castedVote: [2] });
  castVote._execute({ userId: ownerships[7].userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[8].userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[9].userId }, { topicId: voteTopic0, castedVote: [1] });
  castVote._execute({ userId: ownerships[10].userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[11].userId }, { topicId: voteTopic0, castedVote: [0] });

  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic0 }); // This vote is already closed

  const voteTopic1 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: __('demo.vote.1.title'),
    text: __('demo.vote.1.text'),
    vote: {
      closesAt: moment().add(2, 'week').toDate(),
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  // No one voted on this yet

  const voteTopic2 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: __('demo.vote.2.title'),
    text: __('demo.vote.2.text'),
    vote: {
      closesAt: moment().add(1, 'month').toDate(),
      type: 'preferential',
      procedure: 'online',
      effect: 'legal',
      choices: [
        __('demo.vote.2.choice.0'),
        __('demo.vote.2.choice.1'),
        __('demo.vote.2.choice.2'),
        __('demo.vote.2.choice.3'),
      ],
    },
  });

  castVote._execute({ userId: ownerships[1].userId }, { topicId: voteTopic2, castedVote: [1, 2, 3, 4] });
  castVote._execute({ userId: ownerships[2].userId }, { topicId: voteTopic2, castedVote: [2, 3, 4, 1] });
  castVote._execute({ userId: ownerships[3].userId }, { topicId: voteTopic2, castedVote: [3, 4, 1, 2] });
  castVote._execute({ userId: ownerships[6].userId }, { topicId: voteTopic2, castedVote: [2, 1, 3, 4] });
  castVote._execute({ userId: ownerships[7].userId }, { topicId: voteTopic2, castedVote: [2, 3, 4, 1] });

  ['0', '1'].forEach(commentNo =>
    Comments.insert({
      topicId: voteTopic2,
      userId: nextUser(),
      text: __(`demo.vote.2.comment.${commentNo}`),
    })
  );

  const agenda = Agendas.insert({
    communityId: demoCommunityId,
    title: __('demo.agenda.0.title'),
    topicIds: [voteTopic0, voteTopic1, voteTopic2],
  });

  // ===== Tickets =====

  const ticket0 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.0.title'),
    text: __('demo.ticket.0.text'),
    ticket: {
      category: 'building',
      urgency: 'high',
      status: 'progressing',
    },
  });

  const ticket1 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.1.title'),
    text: __('demo.ticket.1.text'),
    ticket: {
      category: 'building',
      urgency: 'normal',
      status: 'closed',
    },
  });

  const ticket2 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.2.title'),
    text: __('demo.ticket.2.text'),
    ticket: {
      category: 'service',
      urgency: 'normal',
      status: 'reported',
    },
  });

  Comments.insert({
    topicId: ticket2,
    userId: nextUser(),
    text: __('demo.ticket.2.comment.0'),
  });

  const ticket3 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.3.title'),
    text: __('demo.ticket.3.text'),
    ticket: {
      category: 'building',
      urgency: 'low',
      status: 'closed',
    },
  });

  // ===== Rooms =====

  const demoMessageRoom = Topics.insert({
    communityId: demoCommunityId,
    userId: demoUserId,
    category: 'room',
    participantIds: [demoUserId, demoUsers[2]],
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: demoUsers[2],
    text: __('demo.messages.0'),
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: demoUserId,
    text: __('demo.messages.1'),
  });

  // ===== PayAccounts =====

  insertPayAccountTemplate(demoCommunityId);

  const locator = PayAccounts.update({
    communityId: demoCommunityId,
    name: 'Könyvelés helye',
  }, {
    $set: {
      children: [
        { name: '',
          children: [
            { name: 'A. épület',
              children: [
              { name: '1' },
              { name: '2' },
              { name: '3' },
              { name: '4' },
              { name: '5' },
              { name: '6' },
              { name: '7' },
              { name: '8' },
              { name: '9' },
              { name: '10' },
              { name: '11' },
              { name: '12' },
              { name: '13' },
              { name: '14' },
              ],
            },
            /*{ name: 'Közös terület',
              children: [
              { name: '100' },
              { name: 'Kert' },
              ],
            },*/
          ],
        },
      ],
    },
  },
    { upsert: false }
  );

  // ===== Payments =====

    // === Opening ===

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-01-01'),
    ref: 'nyitó',
    amount: 100000,
    accounts: {
      'Pénz számla': 'Pénztár 1',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-01-01'),
    ref: 'nyitó',
    amount: 110000,
    accounts: {
      'Pénz számla': 'Bank főszámla',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-01-01'),
    ref: 'nyitó',
    amount: 120000,
    accounts: {
      'Pénz számla': 'Bank felújítási alap',
    },
  });

    // === Befizetesek ===

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-06-01'),
    amount: 10000,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Közös költség befizetés',
      'Könyvelés helye': '1',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-06-02'),
    amount: 20000,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Közös költség befizetés',
      'Könyvelés helye': '2',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-06-03'),
    amount: 30000,
    accounts: {
      'Pénz számla': 'Pénztár',
      'Könyvelés nem': 'Közös költség befizetés',
      'Könyvelés helye': '3',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-06-04'),
    amount: 40000,
    accounts: {
      'Pénz számla': 'Bank felújítási alap',
      'Könyvelés nem': 'Felújítási célbefizetés',
      'Könyvelés helye': '4',
    },
  });

    // === Eloirasok ===

  insertParcelBilling._execute({ userId: demoManagerId }, {
    communityId: demoCommunityId,
    projection: 'perArea',
    amount: 200,
    year: '2017',
    month: 'allMonths',
    accounts: {
      'Könyvelés nem': 'Közös költség befizetés',
      'Könyvelés helye': 'Könyvelés helye',
    },
  });

  insertParcelBilling._execute({ userId: demoManagerId }, {
    communityId: demoCommunityId,
    projection: 'perHabitant',
    amount: 5000,
    year: '2017',
    month: 'allMonths',
    accounts: {
      'Könyvelés nem': 'Víz díj',
      'Könyvelés helye': 'Könyvelés helye',
    },
  });

  insertParcelBilling._execute({ userId: demoManagerId }, {
    communityId: demoCommunityId,
    projection: 'absolute',
    amount: 41000,
    year: '2017',
    month: '8',
    accounts: {
      'Könyvelés nem': 'Felújítási célbefizetés',
      'Könyvelés helye': 'A. épület',
    },
  });

  insertParcelBilling._execute({ userId: demoManagerId }, {
    communityId: demoCommunityId,
    projection: 'absolute',
    amount: 23000,
    year: '2017',
//    month: '3',
    accounts: {
      'Könyvelés nem': 'Felújítási célbefizetés',
      'Könyvelés helye': '4',
    },
  });

    // === Tervezetek ===

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'plan',
    valueDate: new Date('2017-01-01'),
    amount: -24000,
    accounts: {
      'Könyvelés nem': 'Anyagok',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'plan',
    valueDate: new Date('2017-01-01'),
    amount: -415000,
    accounts: {
      'Könyvelés nem': 'Üzemeltetés',
    },
  });

  // ===== Returning a bunch of pointers, for easy direct access

  return {
    demoCommunityId,
    demoUserId,
    demoAdminId,
    demoManagerId,
    demoUsers,
    demoParcels,
  };
}

function deleteDemoUserWithRelevancies(userId, parcelId) {
  Topics.remove({ userId });
  // votes?  
  // topics category: room, participantIds[]: userId
  Comments.remove({ userId });
  Delegations.remove({ sourceUserId: userId });
  Delegations.remove({ targetUserId: userId });
  Memberships.remove({ parcelId }); // removing added benefactors as well
  Parcels.remove({ _id: parcelId });
  Meteor.users.remove({ _id: userId });
}

Meteor.methods({
  createDemoUserWithParcel: function() {
    const demoUsersList = Meteor.users.find({ 'emails.0.address': { $regex: 'demouser@honline.net' } },
      { sort: { createdAt: -1 } }).fetch();
    let counter = 1;
    if (demoUsersList[0]) {
      counter = Number(demoUsersList[0].emails[0].address.split('.')[0]) + 1;
    }
    const demoUserId = Accounts.createUser({
      email: counter + '.demouser@honline.net',
      password: 'password',
      profile: { lastName: _.sample(['Gazda', 'Asztalos', 'Mezei', 'Piros']),
        firstName: _.sample(['Ede', 'Ferenc', 'Jolán', 'Tivadar', 'Boris']) }
    });
    Meteor.users.update({ _id: demoUserId },
      { $set: { 'emails.0.verified': true,
        avatar: 'images/avatars/avatarnull.png',
        'settings.language': 'hu' } });
    const demoCommunityId = Communities.findOne({ name: 'Demo ház' })._id;
    
    const demoParcelId = Parcels.insert({
      communityId: demoCommunityId,
      serial: 14 + counter,
      units: 20,
      floor: 'V',
      number: 12 + counter,
      type: 'flat',
      lot: '4532/8/A/' + (14 + counter),
      area: 20,
    });
    Memberships.insert({ 
      communityId: demoCommunityId,
      userId: demoUserId,
      role: 'owner',
      parcelId: demoParcelId, 
      ownership: { share: new Fraction(1, 1) } });
    Meteor.setInterval(function() {
        deleteDemoUserWithRelevancies(demoUserId, demoParcelId);
      },
      moment.duration(30, 'minutes').asMilliseconds());
    const email = Meteor.users.findOne({ _id: demoUserId }).emails[0].address;
    return email;
  },
})
