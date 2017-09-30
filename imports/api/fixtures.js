import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { Accounts } from 'meteor/accounts-base';
import { Communities } from '/imports/api/communities/communities.js';
import { update as updateCommunity } from '/imports/api/communities/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { billParcels } from '/imports/api/payments/methods.js';
import { insertPayAccountTemplate } from '/imports/api/payaccounts/template.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';


export function insertDemoFixture() {
  //
  // ===== Communities =====

  const demoCommunityId = Communities.insert({
    name: 'Demo ház',
    zip: '1144',
    city: 'Budapest',
    street: 'Kankalin u',
    number: '86',
    lot: '123456/1234',
    image: 'http://4narchitects.hu/wp-content/uploads/2016/07/LEPKE-1000x480.jpg',
    totalunits: 100,
  });

  // ===== Users =====

  // Someone can log in as the demo user, if he doesn't want to register
  const demoUserId = Accounts.createUser({ email: 'demo.user@demo.com', password: 'password' });
  const demoAdminId = Accounts.createUser({ email: 'demo.admin@demo.com', password: 'password' });
  const demoManagerId = Accounts.createUser({ email: 'demo.kk@demo.com', password: 'password' });

  const dummyUsers = [];
  dummyUsers[0] = Meteor.users.insert({
    emails: [{ address: 'baltazarimre@demo.com', verified: true }],
    phone: '06 30 234 5678',
    profile: { lastName: 'Baltazár', firstName: 'Imre' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-2.png',
    status: 'online',
  });
  dummyUsers[1] = Meteor.users.insert({
    emails: [{ address: 'bajorandor@demo.com', verified: true }],
    phone: '+36 70 1234 567',
    profile: { lastName: 'Bajor', firstName: 'Andor' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-7.png',
  });
  dummyUsers[2] = Meteor.users.insert({
    emails: [{ address: 'bakocsitimea@demo.com', verified: true }],
    profile: { lastName: 'Bakocsi', firstName: 'Tímea' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-6.png',
    status: 'standby',
  });
  dummyUsers[3] = Meteor.users.insert({
    emails: [{ address: 'baltapeter@demo.com', verified: true }],
    profile: { lastName: 'Barna', firstName: 'Péter' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-5.png',
  });
  dummyUsers[4] = Meteor.users.insert({
    emails: [{ address: 'baltaemilia@demo.com', verified: true }],
    profile: { lastName: 'Barna', firstName: 'Emilia' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-3.png',
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

  // ===== Memberships =====

  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUserId,
    role: 'owner',
    parcelId: dummyParcels[0],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
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
    userId: dummyUsers[0],
    role: 'manager',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[1],
    role: 'admin',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[1],
    role: 'owner',
    parcelId: dummyParcels[1],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[2],
    role: 'owner',
    parcelId: dummyParcels[2],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[3],
    role: 'owner',
    parcelId: dummyParcels[3],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[3],
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 2),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[4],
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: demoUserId,
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
    },
  });

  // ===== Forum =====

  // The dummy users comment one after the other, round robin style
  let nextUserIndex = 0;
  function nextUser() {
    nextUserIndex %= dummyUsers.length;
    return dummyUsers[nextUserIndex++];
  }

  const data = [
    {
      title: 'Zár probléma',
      text: 'Múlt héten megint benyomták a kaput, és azóta nem jól záródik a zár',
      items: [
        'Igen, már bejelentettem. Jövő héten tudnak csak jönni javítani',
      ],
    },
    {
      title: 'Hangos kutya a negyediken',
      text: 'A negyediken a kutya egész álló nap vonyít. Szólni kéne a gazdinak, hogy ne hagyja egyedül.',
      items: [
        'Engem is rohadtul idegesít!!!',
        'Elnézést kérek a lakóktól. Mienk a kutyus, nem szokott vonyítani. A nagyi sajnos három hétig kórházban, és szegény kutyus nagyon rosszul bírja az egyedüllétet. De szerencsére a nagyit már hazaengedték,  tegnap óta már otthon van. Úgyhogy nem lesz többet gond, és tényeg elnézést kérek mindenkitől.',
      ],
    },
    {
      title: 'Fundamenta hitel',
      text: 'Most kedvezményes feltételekkel lehet felvenni fundamenta hitelt tatarozásra.',
      items: [
        'Szerintem érdemes lenne. A kamat csak 6%, és 10 évre kapnánk.',
        'Nem tudom. Az előző hitelünket épp most tudtuk végre törleszteni. Most végre lemenne a közös költség, és erre megint egy újabb hitel?',
        'Szerintem bocsássuk szavazásra!',
      ],
    },
  ];


  data.forEach((topic) => {
    const topicId = Topics.insert({
      communityId: demoCommunityId,
      userId: nextUser(),
      category: 'forum',
      title: topic.title,
      text: topic.text,
    });

    topic.items.forEach((text) => {
      Comments.insert({
        topicId,
        userId: nextUser(),
        text,
      });
    });
  });

  // ===== News =====

  Topics.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[0],
    category: 'news',
    title: 'Lomtalanítás lesz május 4.-én',
    text: 'A lomokat előző nap (tehát május 3.-án) 18 órától lehet kihelyezni az utcára, amit a FKFV 4.-én szállít el.\n' +
          'A veszélyes hulladékokat a külön erre kijelölt helyre kell vinni. Azokat NEM szabad az utcára kitenni!',
  });
  Topics.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[0],
    category: 'news',
    title: 'Kémények ellenörzéséhez időpontot szükséges kérni',
    text: 'Hónap végéig kötelező a kémények ellenőrzése. Három lehetséges időpont van. 2017.05.11, 2017.05.13, 2017.05.24.\n' +
          'Ezek közül lehet választani és a kéményseprőkkel egyeztetni a 06(20)2569875 telefonszámon hogy kinek melyik felel meg.',
  });

  Topics.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[0],
    category: 'news',
    title: 'Hasznos informáciok',
    text: 'Orvosi rendelő: <span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +36 (1) 345-562 <br>' +
          'Polizei: <small class="text-alt">07</small> <br>' +
          'Közös képviselő: <small class="text-alt"><span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +3630 6545621' +
          ' / <span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> baltazar.imre@demo.com</small>',
    sticky: true,
  });

  // ===== Votes =====

  const ownerships = Memberships.find({ role: 'owner' }).fetch();

  const voteTopic1 = Topics.insert({
    communityId: demoCommunityId,
    userId: demoUserId,
    category: 'vote',
    title: 'Fundamenta hitel felvétele',
    text: 'Felvegyük-e az 5 millio forintos Fundamenta hitelt 15 évre 6%-os kamattal.',
    vote: {
      closesAt: moment().subtract(10, 'day').toDate(),  // its past close date
      type: 'yesno',
    },
  });

  castVote._execute({ userId: ownerships[0].userId }, { topicId: voteTopic1, castedVote: [2] });  // no
  castVote._execute({ userId: ownerships[1].userId }, { topicId: voteTopic1, castedVote: [1] });  // yes
  castVote._execute({ userId: ownerships[2].userId }, { topicId: voteTopic1, castedVote: [2] });  // no
  castVote._execute({ userId: ownerships[3].userId }, { topicId: voteTopic1, castedVote: [0] });  // abstain

  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic1 }); // This vote is already closed

  const voteTopic2 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: 'Kerékpár tároló létesítéséről',
    text: 'Létesítsen-e a ház kerékpár tárolót maximum 200,000 Ft-ból a garázsszinten.\n' +
          'Elfogadás esetén három különböző árajánlatot kérünk be, és a legjobbat választjuk.',
    vote: {
      closesAt: moment().add(2, 'week').toDate(),
      type: 'yesno',
    },
  });

  // No one voted on this yet

  const voteTopic3 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: 'Lépcsőház színéről',
    text: 'Milyen színűre fessük a lépcsőház homlokzatát az augusztusi felújítás során.',
    vote: {
      closesAt: moment().add(1, 'month').toDate(),
      type: 'preferential',
      choices: ['semleges fehér', 'halvány rózsaszín', 'sárga', 'világos szürke'],
    },
  });

  castVote._execute({ userId: ownerships[1].userId }, { topicId: voteTopic3, castedVote: [1, 2, 3, 4] });
  castVote._execute({ userId: ownerships[2].userId }, { topicId: voteTopic3, castedVote: [2, 3, 4, 1] });
  castVote._execute({ userId: ownerships[3].userId }, { topicId: voteTopic3, castedVote: [3, 4, 1, 2] });

  Comments.insert({
    topicId: voteTopic3,
    userId: nextUser(),
    text: 'A halovány színek jobban mutatnak. Világosabb hatású lesz a lépcsőház.',
  });

  Comments.insert({
    topicId: voteTopic3,
    userId: nextUser(),
    text: 'Jajj csak szürke NE legyen. Akkor költözöm.',
  });

  const agenda = Agendas.insert({
    communityId: demoCommunityId,
    title: 'Közgyűlés 2017-II.',
    topicIds: [voteTopic1, voteTopic2, voteTopic3],
  });

  // ===== Tickets =====

  const ticket1 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: 'Elromlott a lift',
    text: 'A hatodikon megállt. Semmilyen gombra nem reagál.',
    ticket: {
      type: 'building',
      urgency: 'high',
      status: 'progressing',
    },
  });

  const ticket2 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: 'Beázik a fürdőszobám a felettem lakótol.',
    text: 'Le is omlott egy darab a mennyezetből. Még szerencse hogy nem fürödtem éppen akkor. Most lehet már nem élnék.',
    ticket: {
      type: 'building',
      urgency: 'normal',
      status: 'closed',
    },
  });

  const ticket3 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: 'Áramkimaradás éjjelente',
    text: 'Harmadszor fordul elő, hogy hirtelen áramkimaradás van éjjel.',
    ticket: {
      type: 'service',
      urgency: 'normal',
      status: 'reported',
    },
  });

  Comments.insert({
    topicId: ticket3,
    userId: nextUser(),
    text: 'Igen, már jelentettem az elműnek. Azt mondták utánanéznek',
  });

  const ticket4 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: 'A lépcsőházban hullik a vakolat',
    text: 'A II. emeleti lépcsőfordulónál vettem észre.',
    ticket: {
      type: 'building',
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
    text: 'Szervusz! Megtaláltam a postaláda kulcsodat. Benne hagytad a levélszekrény ajtajában. :)',
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: demoUserId,
    text: 'Ó de jó. Köszönöm szépen! Már azt hittem elhagytam. Felmegyek érte este, a Barátok közt után.',
  });

  // ===== PayAccounts =====

  insertPayAccountTemplate(demoCommunityId);

  const locator = PayAccounts.update({
    communityId: demoCommunityId,
    name: 'Könyvelési helyek',
  },
  {
    $set: {
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
      { name: '*',
        children: [
        { name: '100' },
        { name: 'Kert' },
        ],
      },
    ] },
    },
    { upsert: false }
  );

  // ===== Payments =====

    // === Opening ===

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    date: new Date('2017-01-01'),
    ref: 'nyitó',
    amount: 100000,
    accounts: {
      'Pénz számlák': 'Pénztár 1',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    date: new Date('2017-01-01'),
    ref: 'nyitó',
    amount: 110000,
    accounts: {
      'Pénz számlák': 'Bank főszámla',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    date: new Date('2017-01-01'),
    ref: 'nyitó',
    amount: 120000,
    accounts: {
      'Pénz számlák': 'Bank felújítási alap',
    },
  });

    // === Befizetesek ===

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    date: new Date('2017-06-01'),
    amount: 10000,
    accounts: {
      'Pénz számlák': 'Bank főszámla',
      'Bevételek': 'Közös költség befizetés',
      'Könyvelési helyek': '1',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    date: new Date('2017-06-02'),
    amount: 20000,
    accounts: {
      'Pénz számlák': 'Bank főszámla',
      'Bevételek': 'Közös költség befizetés',
      'Könyvelési helyek': '2',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    date: new Date('2017-06-03'),
    amount: 30000,
    accounts: {
      'Pénz számlák': 'Pénztár',
      'Bevételek': 'Közös költség befizetés',
      'Könyvelési helyek': '3',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'done',
    date: new Date('2017-06-04'),
    amount: 40000,
    accounts: {
      'Pénz számlák': 'Bank felújítási alap',
      'Bevételek': 'Felújítási célbefizetés',
      'Könyvelési helyek': '4',
    },
  });

    // === Eloirasok ===

  const commonCosts = {
    ccArea: 210,
    ccVolume: 10,
    ccHabitants: 0,
  };
  updateCommunity._execute(
    { userId: dummyUsers[0] },
    { _id: demoCommunityId, modifier: { $set: { finances: commonCosts } } }
  );
  billParcels._execute(
    { userId: dummyUsers[0] },
    { communityId: demoCommunityId },
  );

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'plan',
    date: new Date(2017, 7, 1),
    amount: 52000,
    accounts: {
      'Bevételek': 'Felújítási célbefizetés',
      'Könyvelési helyek': '4',
    },
  });

    // === Tervezetek ===

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'plan',
    date: new Date('2017-01-01'),
    amount: 24000,
    accounts: {
      'Kiadások': 'Anyagok',
    },
  });

  Payments.insert({
    communityId: demoCommunityId,
    phase: 'plan',
    date: new Date('2017-01-01'),
    amount: 415000,
    accounts: {
      'Kiadások': 'Üzemeltetés',
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
