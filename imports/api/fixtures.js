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
import { defaultRoles } from '/imports/api/permissions/roles.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { ParcelBillings } from '/imports/api/payments/parcel-billings/parcel-billings.js';
import { insert as insertParcelBilling } from '/imports/api/payments/parcel-billings/methods.js';
import { insertPayAccountTemplate } from '/imports/api/payaccounts/template.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';


export function insertDemoFixture(lang) {
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
    lot: '123456/1234',
    avatar: 'http://4narchitects.hu/wp-content/uploads/2016/07/LEPKE-1000x480.jpg',
    totalunits: 100,
  });

// ===== Parcels =====

  const dummyParcels = [];
  dummyParcels[0] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 100,
    units: 0,
    floor: '-2',
    number: 'P02',
    type: 'parking',
    lot: '29345/P/002',
    area: 6,
  });
  dummyParcels[1] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 1,
    units: 10,
    floor: 'I',
    number: '12',
    type: 'flat',
    lot: '23456/A/114',
    area: 65,
  });
  dummyParcels[2] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 2,
    units: 20,
    floor: 'II',
    number: '23',
    type: 'flat',
    lot: '23456/A/225',
    area: 142,
  });
  dummyParcels[3] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 3,
    units: 30,
    floor: 'III',
    number: '34',
    type: 'flat',
    lot: '23456/A/336',
    area: '98.4',
  });
  dummyParcels[4] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 4,
    units: 40,
    floor: 'IV',
    number: '45',
    type: 'flat',
    lot: '23456/A/447',
    area: 70,
  });

  // ===== Demo Users with Memberships =====

  // Someone can log in as the demo user, if he doesn't want to register
  const com = { en: 'com', hu: 'hu' }[lang];
  let demoUserId;
  let demoManagerId;
  let demoAdminId;
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
      Memberships.insert({ communityId: demoCommunityId, person: { userId: userWithRoleId }, role: role.name,
        parcelId: dummyParcels[0], ownership: { share: new Fraction(1, 10) } });
      demoUserId = userWithRoleId;
    } else if (role.name === 'benefactor') {
      Memberships.insert({ communityId: demoCommunityId, person: { userId: userWithRoleId }, role: role.name,
        parcelId: dummyParcels[0], benefactorship: { type: 'rental' } });
    } else {
      Memberships.insert({ communityId: demoCommunityId, person: { userId: userWithRoleId }, role: role.name });
    }
    if (role.name === 'manager') demoManagerId = userWithRoleId;
    if (role.name === 'admin') demoAdminId = userWithRoleId;
  });

  // ===== Dummy Users =====

  const dummyUsers = [];
  dummyUsers[0] = Meteor.users.insert({
    emails: [{ address: `user.0@demo.${com}`, verified: true }],
    profile: { lastName: __('demo.user.0.lastName'), firstName: __('demo.user.0.firstName'), phone: '06 30 234 5678' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-2.png',
    status: 'online',
  });
  dummyUsers[1] = Meteor.users.insert({
    emails: [{ address: `user.1@demo.${com}`, verified: true }],
    profile: { lastName: __('demo.user.1.lastName'), firstName: __('demo.user.1.firstName'), phone: '+36 70 1234 567' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-7.png',
  });
  dummyUsers[2] = Meteor.users.insert({
    emails: [{ address: `user.2@demo.${com}`, verified: true }],
    profile: { lastName: __('demo.user.2.lastName'), firstName: __('demo.user.2.firstName') },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-6.png',
    status: 'standby',
  });
  dummyUsers[3] = Meteor.users.insert({
    emails: [{ address: `user.3@demo.${com}`, verified: true }],
    profile: { lastName: __('demo.user.3.lastName'), firstName: __('demo.user.3.firstName') },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-5.png',
  });
  dummyUsers[4] = Meteor.users.insert({
    emails: [{ address: `user.4@demo.${com}`, verified: true }],
    profile: { lastName: __('demo.user.4.lastName'), firstName: __('demo.user.4.firstName') },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-3.png',
  });

  // ===== Memberships =====

  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[0] },
    role: 'manager',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[1] },
    role: 'admin',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[1] },
    role: 'owner',
    parcelId: dummyParcels[1],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    // no userId -- This person is benefactor of parcel[1], but he is not a registered user of the app
    person: { idCard: {
      type: 'natural',
      name: __('demo.user.1.benefactor.name'),
      address: __('demo.user.1.benefactor.address'),
      identifier: '987201NA',
      dob: new Date(1951, 1, 5),
      mothersName: __('demo.user.1.benefactor.mothersName'),
    } },
    role: 'benefactor',
    parcelId: dummyParcels[1],
    benefactorship: {
      type: 'rental',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    // no userId -- This parcel is owned by a legal entity, and the representor for them is user[2]
    person: { idCard: {
      type: 'legal',
      name: __('demo.user.3.company.name'),
      address: __('demo.user.3.company.address'),
      identifier: 'Cg.123456-89',
    } },
    role: 'owner',
    parcelId: dummyParcels[2],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[2] },
    role: 'owner',
    parcelId: dummyParcels[2],
    ownership: {
      share: new Fraction(0),
      representor: true,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[3] },
    role: 'owner',
    parcelId: dummyParcels[3],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[3] },
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 2),
      representor: false,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[4] },
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
      representor: true,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: demoUserId },
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
      representor: false,
    },
  });

  // ===== Forum =====

  // The dummy users comment one after the other, round robin style
  let nextUserIndex = 1;
  function sameUser() {
    return dummyUsers[nextUserIndex];
  }
  function nextUser() {
    nextUserIndex += 7; // relative prime
    nextUserIndex %= dummyUsers.length;
    return dummyUsers[nextUserIndex];
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
      userId: dummyUsers[0],
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

  const ownerships = Memberships.find({ communityId: demoCommunityId, 'active.now': true, role: 'owner', 'person.userId': { $exists: true } }).fetch();

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

  castVote._execute({ userId: ownerships[0].person.userId }, { topicId: voteTopic0, castedVote: [2] });  // no
  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic0, castedVote: [1] });  // yes
  castVote._execute({ userId: ownerships[2].person.userId }, { topicId: voteTopic0, castedVote: [2] });  // no
  castVote._execute({ userId: ownerships[3].person.userId }, { topicId: voteTopic0, castedVote: [0] });  // abstain

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

  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic2, castedVote: [1, 2, 3, 4] });
  castVote._execute({ userId: ownerships[2].person.userId }, { topicId: voteTopic2, castedVote: [2, 3, 4, 1] });
  castVote._execute({ userId: ownerships[3].person.userId }, { topicId: voteTopic2, castedVote: [3, 4, 1, 2] });

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
    participantIds: [demoUserId, dummyUsers[2]],
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: dummyUsers[2],
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
            { name: 'A. lépcsőház',
              children: [
              { name: '1' },
              { name: '2' },
              ],
            },
            { name: 'B. lépcsőház',
              children: [
              { name: '3' },
              { name: '4' },
              ],
            },
            { name: 'Közös terület',
              children: [
              { name: '100' },
              { name: 'Kert' },
              ],
            },
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
      'Könyvelés helye': 'B. lépcsőház',
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
    dummyUsers,
    dummyParcels,
  };
}

export function reCreateDemoHouse() {
  const languages = TAPi18n.getLanguages();
  Object.keys(languages).forEach((lang) => {
    const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };
    const com = { en: 'com', hu: 'hu' }[lang];
    const demoCommunity = Communities.findOne({ name: __('demo.house') });
    if (demoCommunity === undefined) {
      return;
    }; 
    demoCommunity.remove();
    //removeDemoUsers();
    Meteor.users.remove({ 'emails.0.address': { $regex: `@demo.${com}` } });
    insertDemoFixture(lang);     
  });

};