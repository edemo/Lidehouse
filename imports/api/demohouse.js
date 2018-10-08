import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
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
import { Delegations } from '/imports/api/delegations/delegations.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { ParcelBillings } from '/imports/api/payments/parcel-billings/parcel-billings.js';
import { insert as insertParcelBilling } from '/imports/api/payments/parcel-billings/methods.js';
import { insertPayAccountTemplate } from '/imports/api/payaccounts/template.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';
import { Clock } from '/imports/utils/clock';

if (Meteor.isServer) {
  import fs from 'fs';
  import { ShareddocsStore as store } from '/imports/api/shareddocs/shareddocs.js';

  function uploadFileSimulation(storeParams, path) {
     // the object passed can potentially be empty, BUT if you do custom-checks in `transformWrite`
    //  be sure to pass it the information it needs there. It is important, that in `transformWrite`
    //  you link up from & to parameters, otherwise nothing will happen
    const fileId = store.create(
      storeParams
    );
    const readStream = fs.createReadStream(path)  // create the stream
    readStream.on('error', (err) => {
      console.log('error in readStream', err);
    });
    // Save the file to the store
    store.write(readStream, fileId, Meteor.bindEnvironment((err, file) => {
      if (err) {
        console.log('error in Store.write', err, file);
      }
    }));
  }  

  function runWithFakeUserId(userId, toRun) {
    const DDPCommon = Package['ddp-common'].DDPCommon;
    const invocation = new DDPCommon.MethodInvocation({
      isSimulation: false,
      userId,
      setUserId: ()=>{},
      unblock: ()=>{},
      connection: {},
      randomSeed: Math.random()
    });
  
    DDP._CurrentInvocation.withValue(invocation, () => {
      toRun();
    });  
  }
}

const demoParcelCounterStart = 14;

export function insertDemoHouse(lang, demoOrTest) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

  // if Demo house data already populated, no need to do anything
  if (Communities.findOne({ name: __(`${demoOrTest}.house`) })) {
    return;
  }

  // ===== Communities =====

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

// ===== Parcels =====

  const demoParcels = [];
  demoParcels[0] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 1,
    units: 489,
    floor: __('demo.ground'),
    number: '1',
    type: 'flat',
    lot: '4532/8/A/1',
    area: 55,
    volume: 176,
    habitants: 2,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[1] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 2,
    units: 427,
    floor: __('demo.ground'),
    number: '2',
    type: 'flat',
    lot: '4532/8/A/2',
    area: 48,
    volume: 153.6,
    habitants: 2,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[2] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 3,
    units: 587,
    floor: 'I',
    number: '3',
    type: 'flat',
    lot: '4532/8/A/3',
    area: 66,
    volume: 184.8,
    habitants: 3,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[3] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 4,
    units: 622,
    floor: 'I',
    number: '4',
    type: 'flat',
    lot: '4532/8/A/4',
    area: 70,
    volume: 196,
    habitants: 1,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[4] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 5,
    units: 587,
    floor: 'II',
    number: '5',
    type: 'flat',
    lot: '4532/8/A/5',
    area: 66,
    volume: 184.8,
    habitants: 3,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[5] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 6,
    units: 622,
    floor: 'II',
    number: '6',
    type: 'flat',
    lot: '4532/8/A/6',
    area: 70,
    volume: 196,
    habitants: 4,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[6] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 7,
    units: 587,
    floor: 'III',
    number: '7',
    type: 'flat',
    lot: '4532/8/A/7',
    area: 66,
    volume: 184.8,
    habitants: 2,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[7] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 8,
    units: 622,
    floor: 'III',
    number: '8',
    type: 'flat',
    lot: '4532/8/A/8',
    area: 70,
    volume: 196,
    habitants: 2,
    waterMetered: false,
    heatingType: 'centralHeating',
  });
  demoParcels[8] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 9,
    units: 587,
    floor: 'IV',
    number: '9',
    type: 'flat',
    lot: '4532/8/A/9',
    area: 66,
    volume: 184.8,
    habitants: 2,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[9] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 10,
    units: 622,
    floor: 'IV',
    number: '10',
    type: 'flat',
    lot: '4532/8/A/10',
    area: 70,
    volume: 196,
    habitants: 3,
    waterMetered: true,
    heatingType: 'centralHeating',
  });
  demoParcels[10] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 11,
    units: 996,
    floor: __('demo.attic'),
    number: '11',
    type: 'flat',
    lot: '4532/8/A/11',
    area: 112,
    habitants: 5,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[11] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 12,
    units: 444,
    floor: __('demo.cellar'),
    number: '1',
    type: 'cellar',
    lot: '4532/8/A/12',
    area: 50,
    habitants: 1,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[12] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 13,
    units: 613,
    floor: __('demo.cellar'),
    number: '2',
    type: 'cellar',
    lot: '4532/8/A/13',
    area: 69,
    habitants: 1,
    waterMetered: true,
    heatingType: 'ownHeating',
  });
  demoParcels[13] = Parcels.insert({
    communityId: demoCommunityId,
    serial: 14,
    units: 196,
    floor: __('demo.ground'),
    number: '1',
    type: 'shop',
    lot: '4532/8/A/14',
    area: 22,
    habitants: 1,
    waterMetered: false,
    heatingType: 'ownHeating',
  });

  // ===== Demo Users with Roles =====
  
  // You can log in as manager or admin 
  
  const com = { en: 'com', hu: 'hu' }[lang];

  const demoManagerId = Accounts.createUser({ 
    email: `manager@${demoOrTest}.${com}`, password: 'password',
    profile: { lastName: __('demo.manager.lastName'), 
      firstName: __('demo.manager.firstName'), 
      phone: '06 60 555 4321' } 
  });
  Meteor.users.update({ _id: demoManagerId }, 
    { $set: { 'emails.0.verified': true, 
      avatar: '/images/avatars/avatar20.jpg',
      'settings.language': lang } 
    }
  );  
  Memberships.insert({ communityId: demoCommunityId, person: { userId: demoManagerId }, role: 'manager' });  

  const demoAdminId = Accounts.createUser({ 
    email: `admin@${demoOrTest}.${com}`, password: 'password',
    profile: { lastName: __('demo.admin.lastName'), 
      firstName: __('demo.admin.firstName'),
      phone: '06 60 762 7288' } 
  });
  Meteor.users.update({ _id: demoAdminId }, 
    { $set: { 'emails.0.verified': true, 
      avatar: '/images/avatars/avatar21.jpg',
      'settings.language': lang } 
    }
  );  
  Memberships.insert({ communityId: demoCommunityId, person: { userId: demoAdminId }, role: 'admin' });  

  // ===== Filling demo Users =====

  const dummyUsers = [];
  for (let userNo = 0; userNo < 18; userNo++) {
    const lastName = __(`demo.user.${userNo}.lastName`);
    const firstName = __(`demo.user.${userNo}.firstName`);
    dummyUsers.push(Meteor.users.insert({
      emails: [{ address: `${firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, "")}.${lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, "")}.${userNo}@${demoOrTest}.${com}`, verified: true }],
      profile: { lastName, firstName },
      avatar: `/images/avatars/avatar${userNo}.jpg`,
      settings: { language: lang },
    }));
  }

  const demoMaintainerId = (Meteor.users.insert({
    emails: [{ address: `demo.maintainer@${demoOrTest}.${com}`, verified: true }],
    profile: { lastName: __('demo.maintainer.lastName'), firstName: __('demo.maintainer.firstName') },
    avatar: '/images/avatars/avatarnull.png',
    settings: { language: lang },
  }));
  Memberships.insert({ communityId: demoCommunityId, person: { userId: demoMaintainerId }, role: 'maintainer' }); 

  const dummyUserId = dummyUsers[5];

  // ===== Memberships =====

  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[3] },
    role: 'accountant',
  });
  [4, 10, 16].forEach((userNo) => { 
    Memberships.insert({
      communityId: demoCommunityId,
      person: { userId: dummyUsers[userNo] },
      role: 'overseer',
    });
  });
  [0, 1, 4, 5, 6, 7, 8, 9, 10, 12].forEach((parcelNo) => {
    Memberships.insert({
      communityId: demoCommunityId,
      person: { userId: dummyUsers[parcelNo] },
      role: 'owner',
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(1, 1),
      },
    });
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[5] },
    role: 'owner',
    parcelId: demoParcels[11],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[2] },
    role: 'owner',
    parcelId: demoParcels[2],
    ownership: {
      share: new Fraction(1, 2),
      representor: true,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[14] },
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
      person: { idCard: {
        type: 'legal',
        name: __(`demo.user.${parcelNo}.company.name`),
        address: __(`demo.user.${parcelNo}.company.address`),
        identifier: __(`demo.user.${parcelNo}.company.regno`),
      } },
      role: 'owner',
      parcelId: demoParcels[parcelNo],
      ownership: {
        share: new Fraction(1, 1),
      },
    });
    Memberships.insert({
      communityId: demoCommunityId,
      person: { userId: dummyUsers[parcelNo] },
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
    person: { idCard: {
      type: 'natural',
      name: __(`demo.user.${parcelNo}.benefactor.name`),
      address: __(`demo.user.${parcelNo}.benefactor.address`),
      identifier: `${parcelNo}87201NA`,
      dob: new Date(1965, `${parcelNo}`, 5),
      mothersName: __(`demo.user.${parcelNo}.benefactor.mothersName`),
    } },
    role: 'benefactor',
    parcelId: demoParcels[parcelNo],
    benefactorship: {
      type: 'rental',
    },
    });
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[11] },
    role: 'benefactor',
    parcelId: demoParcels[4],
    benefactorship: {
      type: 'rental',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[15] },
    role: 'benefactor',
    parcelId: demoParcels[5],
    benefactorship: {
      type: 'favor',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[16] },
    role: 'benefactor',
    parcelId: demoParcels[8],
    benefactorship: {
      type: 'favor',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[17] },
    role: 'benefactor',
    parcelId: demoParcels[9],
    benefactorship: {
      type: 'rental',
    },
  });

  // ===== Forum =====

  // The demo (filling) users comment one after the other, round robin style
  let nextUserIndex = 1;
  function sameUser() {
    return dummyUsers[nextUserIndex];
  }
  function nextUser() {
    nextUserIndex += 7; // relative prime
    nextUserIndex %= dummyUsers.length;
    return dummyUsers[nextUserIndex];
  }

  const demoTopicDates = [
    moment('2017-08-03 17:32').toDate(),
    moment('2017-09-16 08:25').toDate(),
    moment('2018-07-09 15:10').toDate(),
  ];

  ['0', '1', '2'].forEach((topicNo) => {
    Clock.setSimulatedTime(demoTopicDates[topicNo]);
    const topicId = Topics.insert({
      communityId: demoCommunityId,
      userId: nextUser(),
      category: 'forum',
      title: __(`demo.topic.${topicNo}.title`),
      text: __(`demo.topic.${topicNo}.text`),
    });

    ['0', '1', '2'].forEach((commentNo) => {
      Clock.setSimulatedTime(moment(demoTopicDates[topicNo]).add((commentNo + 1) * 45, 'minutes').toDate());
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
  Clock.clear();

  // ===== News =====

  ['0', '1'].forEach((newsNo) => {
    Clock.setSimulatedTime(moment().subtract(1, 'weeks').toDate());
    const newsId = Topics.insert({
      communityId: demoCommunityId,
      userId: dummyUsers[0],
      category: 'news',
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

  const agendaFirstId = Agendas.insert({
    communityId: demoCommunityId,
    title: __('demo.agenda.0.title'),
//    topicIds: [voteTopic0, voteTopic1],
  });
  const agendaSecondId = Agendas.insert({
    communityId: demoCommunityId,
    title: __('demo.agenda.1.title'),
//    topicIds: [voteTopic4, voteTopic5, voteTopic5],
  });

  const ownerships = Memberships.find({ communityId: demoCommunityId, 'active.now': true, role: 'owner', 'person.userId': { $exists: true } }).fetch();

  Clock.setSimulatedTime(moment(demoTopicDates[1]).add(1, 'weeks').toDate());
  const voteTopic0 = Topics.insert({
    communityId: demoCommunityId,
    userId: demoManagerId,
    category: 'vote',
    title: __('demo.vote.0.title'),
    text: __('demo.vote.0.text'),
    agendaId: agendaFirstId,
    vote: {
      closesAt: moment(demoTopicDates[1]).add(5, 'weeks').toDate(),  // its past close date
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castVote._execute({ userId: ownerships[0].person.userId }, { topicId: voteTopic0, castedVote: [1] }); // no
  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic0, castedVote: [0] }); // yes
  castVote._execute({ userId: ownerships[2].person.userId }, { topicId: voteTopic0, castedVote: [2] }); // abstain
  castVote._execute({ userId: ownerships[3].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[4].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[5].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[6].person.userId }, { topicId: voteTopic0, castedVote: [2] });
  castVote._execute({ userId: ownerships[7].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[8].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[9].person.userId }, { topicId: voteTopic0, castedVote: [1] });
  castVote._execute({ userId: ownerships[10].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[11].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  castVote._execute({ userId: ownerships[12].person.userId }, { topicId: voteTopic0, castedVote: [0] });
  Clock.setSimulatedTime(moment(demoTopicDates[1]).add(5, 'weeks').toDate());
  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic0 }); // This vote is already closed
  Clock.clear();
  
  Clock.setSimulatedTime(moment('2017-09-20 09:04').toDate());
  const voteTopic1 = Topics.insert({
    communityId: demoCommunityId,
    userId: demoManagerId,
    category: 'vote',
    title: __('demo.vote.1.title'),
    text: __('demo.vote.1.text'),
    agendaId: agendaFirstId,
    vote: {
      closesAt: moment('2017-10-14 09:04').toDate(),
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castVote._execute({ userId: ownerships[0].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[2].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[3].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[4].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[5].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[6].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[7].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[8].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[9].person.userId }, { topicId: voteTopic1, castedVote: [1] });
  castVote._execute({ userId: ownerships[10].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  castVote._execute({ userId: ownerships[11].person.userId }, { topicId: voteTopic1, castedVote: [0] });
  Clock.setSimulatedTime(moment('2017-10-14 09:04').toDate());
  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic1 }); // This vote is already closed
  Clock.clear();

  Clock.setSimulatedTime(moment('2018-01-03 13:12').toDate());
  const voteTopic2 = Topics.insert({
    communityId: demoCommunityId,
    userId: dummyUserId,
    category: 'vote',
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

  castVote._execute({ userId: ownerships[7].person.userId }, { topicId: voteTopic2, castedVote: [0] });
  castVote._execute({ userId: ownerships[8].person.userId }, { topicId: voteTopic2, castedVote: [0] });
  castVote._execute({ userId: ownerships[9].person.userId }, { topicId: voteTopic2, castedVote: [0] });
  castVote._execute({ userId: ownerships[12].person.userId }, { topicId: voteTopic2, castedVote: [0] });
  castVote._execute({ userId: ownerships[13].person.userId }, { topicId: voteTopic2, castedVote: [0] });
  Clock.setSimulatedTime(moment('2018-01-18 22:45').toDate());
  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic2 }); // This vote is already closed
  Clock.clear();

  Clock.setSimulatedTime(moment().subtract(3, 'weeks').toDate());
  const voteTopic3 = Topics.insert({
    communityId: demoCommunityId,
    userId: demoManagerId,
    category: 'vote',
    title: __('demo.vote.3.title'),
    text: __('demo.vote.3.text'),
    agendaId: agendaSecondId,
    vote: {
      closesAt: moment().add(2, 'month').toDate(),
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  // No one voted on this yet

  Clock.setSimulatedTime(moment().subtract(1, 'weeks').toDate());
  const voteTopic4 = Topics.insert({
    communityId: demoCommunityId,
    userId: ownerships[1].person.userId,
    category: 'vote',
    title: __('demo.vote.4.title'),
    text: __('demo.vote.4.text'),
    agendaId: agendaSecondId,
    vote: {
      closesAt: moment().add(2, 'month').toDate(),
      type: 'preferential',
      procedure: 'online',
      effect: 'legal',
      choices: [
        __('demo.vote.4.choice.0'),
        __('demo.vote.4.choice.1'),
        __('demo.vote.4.choice.2'),
        __('demo.vote.4.choice.3'),
      ],
    },
  });

  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic4, castedVote: [0, 1, 2, 3] });
  castVote._execute({ userId: ownerships[2].person.userId }, { topicId: voteTopic4, castedVote: [1, 2, 3, 0] });
  castVote._execute({ userId: ownerships[3].person.userId }, { topicId: voteTopic4, castedVote: [2, 3, 0, 1] });
  castVote._execute({ userId: ownerships[6].person.userId }, { topicId: voteTopic4, castedVote: [1, 0, 2, 3] });
  castVote._execute({ userId: ownerships[7].person.userId }, { topicId: voteTopic4, castedVote: [1, 2, 3, 0] });
  castVote._execute({ userId: ownerships[8].person.userId }, { topicId: voteTopic4, castedVote: [1, 2, 0, 3] });
  
  ['0', '1'].forEach((commentNo) => {
    Clock.setSimulatedTime(moment().subtract(3, 'days').add(commentNo + 2, 'minutes').toDate());
    Comments.insert({
      topicId: voteTopic4,
      userId: nextUser(),
      text: __(`demo.vote.4.comment.${commentNo}`),
    })
  });
  Clock.clear();

  Clock.setSimulatedTime(moment().subtract(3, 'days').toDate());
  const voteTopic5 = Topics.insert({
    communityId: demoCommunityId,
    userId: ownerships[8].person.userId,
    category: 'vote',
    title: __('demo.vote.5.title'),
    text: __('demo.vote.5.text'),
    agendaId: agendaSecondId,
    vote: {
      closesAt: moment().add(2, 'month').toDate(),
      procedure: 'online',
      effect: 'legal',
      type: 'petition',
    },
  });

  castVote._execute({ userId: ownerships[0].person.userId }, { topicId: voteTopic5, castedVote: [0] });
  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic5, castedVote: [0] });
  Clock.clear();

  // ===== Shareddocs =====

  let filename1;
  let filename2;
  let filename3;
  let filename4;
  let filename5 = 'bikestorage.jpg';
  let demofile1 = 'assets/app/demohouseDocs/alaprajz.jpg';
  let demofile2;
  let demofile3;
  let demofile4;
  let demofile5 = 'assets/app/demohouseDocs/kerekpartarolo.jpg';

  if (lang === 'hu') {
    filename1 = 'Alaprajz.jpg';
    filename2 = 'Fontos_telefonszámok.xls';
    filename3 = 'Társasházi_törvény.pdf';
    filename4 = 'SZMSZ_201508.pdf';
    demofile2 = 'assets/app/demohouseDocs/telefon.xls';
    demofile3 = 'assets/app/demohouseDocs/tv.pdf';
    demofile4 = 'assets/app/demohouseDocs/szmsz.pdf';
  }
  if (lang === 'en') {
    filename1 = 'Floorplan.jpg';
    filename2 = 'Important_phone_numbers.xls';
    filename3 = 'Act.pdf';
    filename4 = 'ByLaws.pdf';
    demofile2 = 'assets/app/demohouseDocs/phone.xls';
    demofile3 = 'assets/app/demohouseDocs/act.pdf';
    demofile4 = 'assets/app/demohouseDocs/bylaws.pdf';
  }

  runWithFakeUserId(demoManagerId, () => {
    uploadFileSimulation({
      name: filename1,
      type: 'image/jpg',
      communityId: demoCommunityId,
      userId: demoManagerId,
      folderId: 'main',
    }, demofile1);
  });

  runWithFakeUserId(demoManagerId, () => {
    uploadFileSimulation({
      name: filename2,
      type: 'application/vnd.ms-excel',
      communityId: demoCommunityId,
      userId: demoManagerId,
      folderId: 'main',
    }, demofile2);
  });

  runWithFakeUserId(demoManagerId, () => {
    uploadFileSimulation({
      name: filename3,
      type: 'application/pdf',
      communityId: demoCommunityId,
      userId: demoManagerId,
      folderId: 'main',
    }, demofile3);
  });

  runWithFakeUserId(demoManagerId, () => {
    uploadFileSimulation({
      name: filename4,
      type: 'application/pdf',
      communityId: demoCommunityId,
      userId: demoManagerId,
      folderId: 'community',
    }, demofile4);
  });

  runWithFakeUserId(demoManagerId, () => {
    uploadFileSimulation({
      name: filename5,
      type: 'image/jpg',
      communityId: demoCommunityId,
      userId: demoManagerId,
      folderId: 'voting',
      topicId: voteTopic3,
    }, demofile5);
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

  Clock.setSimulatedTime(moment().subtract(3, 'months').add(25, 'minutes').toDate());
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
  Clock.setSimulatedTime(moment().subtract(3982, 'minutes').toDate());
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
  Clock.setSimulatedTime(moment().subtract(3950, 'minutes').toDate())
  Comments.insert({
    topicId: ticket2,
    userId: nextUser(),
    text: __('demo.ticket.2.comment.0'),
  });

  Clock.setSimulatedTime(moment().subtract(6, 'weeks').add(123, 'minutes').toDate());
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
  Clock.clear();

  // ===== Rooms =====

 /* const demoMessageRoom = Topics.insert({
    communityId: demoCommunityId,
    userId: dummyUserId,
    category: 'room',
    participantIds: [dummyUserId, dummyUsers[2]],
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: dummyUsers[2],
    text: __('demo.messages.0'),
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: dummyUserId,
    text: __('demo.messages.1'),
  });*/

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
            { name: 'Központi',
              children: [
              ],
            },
            { name: 'albetétek',
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
          ],
        },
      ],
    },
  },
    { upsert: false }
  );

    // === Eloirasok ===

  insertParcelBilling._execute({ userId: demoManagerId }, {
    communityId: demoCommunityId,
    projection: 'perArea',
    amount: 275,
    year: '2017',
    month: 'allMonths',
    accounts: {
      'Könyvelés nem': 'Közös költség befizetés',
      'Könyvelés helye': 'albetétek',
    },
  });

  for (let i = 0; i < 4; i++) {
    const place = ['2', '5', '8', '14'];
    insertParcelBilling._execute({ userId: demoManagerId }, {
      communityId: demoCommunityId,
      projection: 'perHabitant',
      amount: 2500,
      year: '2017',
      month: 'allMonths',
      accounts: {
        'Könyvelés nem': 'Víz díj',
        'Könyvelés helye': place[i],
      },
    });
  }

  for (let i = 1; i < 11; i++) {
    insertParcelBilling._execute({ userId: demoManagerId }, {
      communityId: demoCommunityId,
      projection: 'perVolume',
      amount: 85,
      year: '2017',
      month: 'allMonths',
      accounts: {
        'Könyvelés nem': 'Fűtési díj',
        'Könyvelés helye': i.toString(),
      },
    });
  }

  insertParcelBilling._execute({ userId: demoManagerId }, {
    communityId: demoCommunityId,
    projection: 'absolute',
    amount: 60000,
    year: '2017',
    month: '9',
    accounts: {
      'Könyvelés nem': 'Felújítási célbefizetés',
      'Könyvelés helye': 'albetétek',
    },
    note: __('demo.payments.note.0'),
  });


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
    amount: 3500,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Egyéb bevétel',
      'Könyvelés helye': 'Központi',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-02-01'),
    amount: 300,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Kamat pénzintézetektől',
      'Könyvelés helye': 'Központi',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-04-01'),
    amount: 400,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Kamat pénzintézetektől',
      'Könyvelés helye': 'Központi',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-06-01'),
    amount: 200,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Kamat pénzintézetektől',
      'Könyvelés helye': 'Központi',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-08-01'),
    amount: 100,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Kamat pénzintézetektől',
      'Könyvelés helye': 'Központi',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-10-01'),
    amount: 600,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Kamat pénzintézetektől',
      'Könyvelés helye': 'Központi',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-12-01'),
    amount: 550,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Kamat pénzintézetektől',
      'Könyvelés helye': 'Központi',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-09-15'),
    amount: 500000,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Támogatás',
      'Könyvelés helye': 'Központi',
    },
    note: __('demo.payments.note.1'),
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-05-10'),
    amount: 55000,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Bérleti díj',
      'Könyvelés helye': 'Központi',
    },
    note: __('demo.payments.note.2'),
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-10-15'),
    amount: 500000,
    accounts: {
      'Pénz számla': 'Bank főszámla',
      'Könyvelés nem': 'Egyéb bevétel',
      'Könyvelés helye': 'Központi',
    },
    note: __('demo.payments.note.3'),
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    valueDate: new Date('2017-07-21'),
    amount: 2300000,
    accounts: {
      'Pénz számla': 'Hitelszámla',
      'Könyvelés nem': 'Bank hitel',
      'Könyvelés helye': 'Központi',
    },
    note: __('demo.payments.note.4'),
  });

  for (let m = 1; m < 13; m++) {
    for (let i = 1; i < 15; i++) {
      const payable = [0, 15125, 13200, 18150, 19250, 18150, 19250, 18150,
        19250, 18150, 19250, 30800, 13750, 19000, 6050];
      Payments.insert({
        communityId: demoCommunityId,
        phase: 'done',
        valueDate: new Date('2017-' + m + '-' + _.sample(['01', '02', '03', '04', '05', '06', '07', '08', '11', '12', '17'])),
        amount: payable[i],
        accounts: {
          'Pénz számla': 'Bank főszámla',
          'Könyvelés nem': 'Közös költség befizetés',
          'Könyvelés helye': i.toString(),
        },
      });
    }
  }

  for (let m = 1; m < 13; m++) {
    for (let i = 0; i < 4; i++) {
      const payable = [5000, 7500, 5000, 2500];
      const place = ['2', '5', '8', '14'];
      Payments.insert({
        communityId: demoCommunityId,
        phase: 'done',
        valueDate: new Date('2017-' + m + '-' + _.sample(['02', '03', '04', '05', '06', '07', '08', '10'])),
        amount: payable[i],
        accounts: {
          'Pénz számla': 'Bank főszámla',
          'Könyvelés nem': 'Víz díj',
          'Könyvelés helye': place[i],
        },
      });
    }
  }
  for (let m = 1; m < 13; m++) {
    for (let i = 1; i < 11; i++) {
      const payable = [0, 14960, 13056, 15708, 16660, 15708, 16660, 15708, 16660, 15708, 16660];
      Payments.insert({
        communityId: demoCommunityId,
        phase: 'done',
        valueDate: new Date('2017-' + m + '-' + _.sample(['02', '03', '04', '05', '06', '07', '08', '10'])),
        amount: payable[i],
        accounts: {
          'Pénz számla': 'Bank főszámla',
          'Könyvelés nem': 'Fűtési díj',
          'Könyvelés helye': i.toString(),
        },
      });
    }
  }

  for (let i = 1; i < 15; i++) {
    Payments.insert({
      communityId: demoCommunityId,
      phase: 'done',
      valueDate: new Date('2017-09-' + _.sample(['10', '11', '12', '16', '17', '18', '21'])),
      amount: 60000,
      accounts: {
        'Pénz számla': 'Bank főszámla',
        'Könyvelés nem': 'Felújítási célbefizetés',
        'Könyvelés helye': i.toString(),
      },
    });
  }

  for (let m = 1; m < 13; m += 2) {
    const payable = [0, -8432, 0, -7250, 0, -9251, 0, -11624, 0, -10635, 0, -8540];
    Payments.insert({
      communityId: demoCommunityId,
      phase: 'done',
      valueDate: new Date('2017-' + m + '-' + _.sample(['03', '04', '05', '06', '08', '10'])),
      amount: payable[m],
      accounts: {
        'Pénz számla': 'Bank főszámla',
        'Könyvelés nem': 'Víz',
        'Könyvelés helye': 'Központi',
      },
    });
  }

  for (let m = 1; m < 13; m += 2) {
    const payable = [0, -10562, 0, -9889, 0, -11210, 0, -11152, 0, -11435, 0, -9930];
    Payments.insert({
      communityId: demoCommunityId,
      phase: 'done',
      valueDate: new Date('2017-' + m + '-' + _.sample(['03', '04', '05', '06', '08', '10'])),
      amount: payable[m],
      accounts: {
        'Pénz számla': 'Bank főszámla',
        'Könyvelés nem': 'Csatorna',
        'Könyvelés helye': 'Központi',
      },
    });
  }

  for (let m = 1; m < 13; m++) {
    Payments.insert({
      communityId: demoCommunityId,
      phase: 'done',
      valueDate: new Date('2017-' + m + '-' + _.sample(['03', '04', '05', '06', '07', '08', '10'])),
      amount: -10250,
      accounts: {
        'Pénz számla': 'Bank főszámla',
        'Könyvelés nem': 'Áram',
        'Könyvelés helye': 'Központi',
      },
    });
  }

    // === Tervezetek ===

 /* Payments.insert({
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
  });*/

  // ===== Returning a bunch of pointers, for easy direct access

  return {
    demoCommunityId,
    dummyUserId,
    demoAdminId,
    demoManagerId,
    dummyUsers,
    demoParcels,
  };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function insertLoginableUsersWithRoles(lang, demoOrTest) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };
  const com = { en: 'com', hu: 'hu' }[lang];
  if (Meteor.users.findOne({ 'emails.0.address': __(`guest@${demoOrTest}.${com}`) })) {
    return;
  }
  const communityId = Communities.findOne({ name: __(`${demoOrTest}.house`) })._id;
  defaultRoles.forEach(function (role) {
    if (role.name === 'manager' || role.name === 'admin') {
      return;
    }
    const firstNames = __('demo.user.firstNames').split('\n');
    const userWithRoleId = Accounts.createUser({
      email: role.name + `@${demoOrTest}.${com}`,
      password: 'password',
      profile: { lastName: capitalize(__(role.name)), firstName: _.sample(firstNames) } });
    const user = Meteor.users.findOne(userWithRoleId);
    const parcelId = Parcels.findOne({ communityId, serial: 7 })._id;
    Meteor.users.update({ _id: userWithRoleId },
      { $set: {
        'emails.0.verified': true,
        avatar: '/images/avatars/avatarTestUser.png',
        'settings.language': lang,
      } });
    if (role.name === 'owner') {
      Memberships.update({ parcelId }, { $set: { ownership: { share: new Fraction(1, 2), representor: false } } });
      Memberships.insert({ communityId, person: { userId: userWithRoleId }, role: role.name,
        parcelId,  ownership: { share: new Fraction(1, 2), representor: true } });
    } else if (role.name === 'benefactor') {
      Memberships.insert({ communityId, person: { userId: userWithRoleId }, role: role.name,
        parcelId, benefactorship: { type: 'rental' } });
    } else {
      Memberships.insert({ communityId, person: { userId: userWithRoleId }, role: role.name });
    }
  });
}

function deleteDemoUserWithRelevancies(userId, parcelId, communityId) {
  debugAssert(userId && parcelId && communityId, `deleteDemoUserWithRelevancies parameter not defined ${userId} ${parcelId} ${communityId}`);
  const counter = Number(Meteor.users.findOne({ _id: userId }).emails[0].address.split('.')[0]);
  const demoUserNumber = demoParcelCounterStart + counter;
  Topics.remove({ userId });
  Topics.remove({ 'participantIds.$': userId });
  const demoUserVote = 'voteCasts.' + userId;
  const demoUserVoteIndirect = 'voteCastsIndirect.' + userId;
  Topics.update({ [demoUserVote]: { $exists: true } },
    { $unset: { [demoUserVote]: 1 } }, { multi: true });
  const modifiedTopics = Topics.find({ [demoUserVoteIndirect]: { $exists: true } });
  if (Meteor.isServer) {
    modifiedTopics.forEach(topic => topic.voteEvaluate(false));
  }
  Comments.remove({ userId });
  Delegations.remove({ sourcePersonId: userId });
  Delegations.remove({ targetPersonId: userId });
  Memberships.remove({ parcelId }); // removing added benefactors as well
  Parcels.remove({ _id: parcelId });
  const currentTotalunits = Communities.findOne({ _id: communityId }).totalunits;
  if (currentTotalunits > 10000) {
    Communities.update({ _id: communityId }, { $set: { totalunits: (currentTotalunits - 100) } });
  }
  ParcelBillings.remove({ 'accounts.Könyvelés helye': demoUserNumber.toString() });
  Payments.remove({ 'accounts.Könyvelés helye': demoUserNumber.toString() });
  PayAccounts.update({
    communityId,
    name: 'Könyvelés helye',
  }, {
    $pull: { 'children.0.children.1.children': { name: demoUserNumber.toString() } },
  });
  Meteor.users.remove({ _id: userId });
}

const demoUserLifetime = moment.duration(2, 'hours').asMilliseconds();

Meteor.methods({
  createDemoUserWithParcel(lang) {
    check(lang, String);
    if (Meteor.isClient) return;  // This should run only on the server side

    const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };
    const demoUsersList = Meteor.users.find({ 'emails.0.address': { $regex: `${lang}demouser@honline.net` } },
      { sort: { createdAt: -1 } }).fetch();
    let counter = 1;
    if (demoUsersList[0]) {
      counter = Number(demoUsersList[0].emails[0].address.split('.')[0]) + 1;
    }
    let nameCounter = counter;
    while (nameCounter > 20) nameCounter -= 20;
    const firstNames = __('demo.user.firstNames').split('\n');
    
    const demoUserId = Accounts.createUser({
      email: counter + `.${lang}demouser@honline.net`,
      password: 'password',
      profile: { lastName: capitalize(__('guest')), firstName: firstNames[nameCounter] },
    });
    Meteor.users.update({ _id: demoUserId },
      { $set: { 'emails.0.verified': true,
        avatar: '/images/avatars/avatarnull.png',
        'settings.language': lang } });
    const demoHouse = Communities.findOne({ name: __('demo.house') });
    const demoCommunityId = demoHouse._id;
    const totalunits = demoHouse.totalunits;
    if (demoUsersList.length >= 10) {
      Communities.update({ _id: demoCommunityId }, { $set: { totalunits: (totalunits + 100) } });
    }
    const demoParcelSerial = demoParcelCounterStart + counter;
    const demoParcelId = Parcels.insert({
      communityId: demoCommunityId,
      serial: demoParcelSerial,
      units: 100,
      floor: 'V',
      number: demoParcelSerial - 2,
      type: 'flat',
      lot: '4532/8/A/' + demoParcelSerial,
      area: 25,
    });
    Memberships.insert({
      communityId: demoCommunityId,
      person: { userId: demoUserId },
      role: 'owner',
      parcelId: demoParcelId,
      ownership: { share: new Fraction(1, 1) } });

    PayAccounts.update({
      communityId: demoCommunityId,
      name: 'Könyvelés helye',
    }, {
      $push: { 'children.0.children.1.children': { name: demoParcelSerial } },
    });

    const com = { en: 'com', hu: 'hu' }[lang];
    const demoManagerId = Meteor.users.findOne({ 'emails.0.address': `manager@demo.${com}` })._id;
    const dummyUserId = Meteor.users.findOne({ 'emails.0.address': { $regex: `.1@demo.${com}` } })._id;
    const demoUserMessageRoom = Topics.insert({
      communityId: demoCommunityId,
      userId: demoUserId,
      category: 'room',
      participantIds: [demoUserId, demoManagerId],
    });
    Comments.insert({
      topicId: demoUserMessageRoom,
      userId: demoManagerId,
      text: __('demo.manager.message'),
    });
    const demoUserMessageRoom2 = Topics.insert({
      communityId: demoCommunityId,
      userId: demoUserId,
      category: 'room',
      participantIds: [demoUserId, dummyUserId],
    });
    Clock.setSimulatedTime(moment().subtract(6, 'hours').toDate());
    Comments.insert({
      topicId: demoUserMessageRoom2,
      userId: demoUserId,
      text: __('demo.messages.0'),
    });
    Clock.setSimulatedTime(moment().subtract(3, 'hours').toDate());
    Comments.insert({
      topicId: demoUserMessageRoom2,
      userId: dummyUserId,
      text: __('demo.messages.1'),
    }); 
    Clock.clear();
    // TODO: Do this thing in the comments.insert method,
    // Everyone has seen his own comments! So set it to be seen by him, when he comments.
    Meteor.users.update({ _id: demoUserId }, { $set: {
      lastSeens: [
        { [demoUserMessageRoom2]: { timestamp: new Date(), commentCounter: 1 } },
        { [demoUserMessageRoom2]: { timestamp: new Date(), commentCounter: 1 } },
      ],
    } });

    insertParcelBilling._execute({ userId: demoManagerId }, {
      communityId: demoCommunityId,
      projection: 'perArea',
      amount: 275,
      year: '2017',
      month: 'allMonths',
      accounts: {
        'Könyvelés nem': 'Közös költség befizetés',
        'Könyvelés helye': demoParcelSerial.toString(),
      },
    });
    for (let m = 1; m < 13; m++) {
      Payments.insert({
        communityId: demoCommunityId,
        phase: 'done',
        valueDate: new Date('2017-' + m + '-' + _.sample(['04', '05', '06', '07', '08', '11'])),
        amount: 6875,
        accounts: {
          'Pénz számla': 'Bank főszámla',
          'Könyvelés nem': 'Közös költség befizetés',
          'Könyvelés helye': demoParcelSerial.toString(),
        },
      });
    }

    Meteor.setTimeout(function () {
      deleteDemoUserWithRelevancies(demoUserId, demoParcelId, demoCommunityId);
    }, demoUserLifetime);

    const email = Meteor.users.findOne({ _id: demoUserId }).emails[0].address;
    return email;
  },
});

export function deleteDemoUsersAfterRestart() {
  const demousers = Meteor.users.find({ 'emails.0.address': { $regex: 'demouser@honline.net' } });
  const huCommunityId = Communities.findOne({ name: 'Demo ház' })._id;
  const enCommunityId = Communities.findOne({ name: 'Demo house' })._id;
  let communityId;
  demousers.forEach((user) => {
    if (user.emails[0].address.includes('hudemouser')) communityId = huCommunityId;
    if (user.emails[0].address.includes('endemouser')) communityId = enCommunityId;
    const parcelSerial = Number(user.emails[0].address.split('.')[0]) + demoParcelCounterStart;
    const parcelId = Parcels.findOne({ communityId, serial: parcelSerial })._id;
    const currentTime = moment().valueOf();
    let timeUntilDelete = moment(user.createdAt).add(demoUserLifetime).subtract(currentTime).valueOf();
    if (timeUntilDelete < 0) timeUntilDelete = 0;
    Meteor.setTimeout(() => deleteDemoUserWithRelevancies(user._id, parcelId, communityId),
      timeUntilDelete);
  });
}
