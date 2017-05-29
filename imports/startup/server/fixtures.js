import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';

import { Comments } from '../../api/comments/comments.js';
import { Communities } from '../../api/communities/communities.js';
import { Memberships } from '../../api/memberships/memberships.js';
import { Topics } from '../../api/topics/topics.js';


// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  if (Communities.findOne({ name: 'Demo ház' })) {
    return; // Demo data already populated
  }

  const demoCommunityId = Communities.insert({
    name: 'Demo ház',
    profile: {
      lot: '123456/1234',
      address: {
        city: 'Budapest',
        street: 'Kankalin u',
        number: '86',
        zip: '1144',
      },
    },
    totalshares: 10000,
  });

  const dummyUsers = [];
  dummyUsers[0] = Meteor.users.insert({
    emails: [{ address: 'baltazarimre@demo.com', verified: true }],
    profile: { lastName: 'Baltazár', firstName: 'Imre' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-2.png',
  });
  dummyUsers[1] = Meteor.users.insert({
    emails: [{ address: 'bajorandor@demo.com', verified: true }],
    profile: { lastName: 'Bajor', firstName: 'Andor' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-7.png',
  });
  dummyUsers[2] = Meteor.users.insert({
    emails: [{ address: 'bakocsitimea@demo.com', verified: true }],
    profile: { lastName: 'Bakocsi', firstName: 'Tímea' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-6.png',
  });
  dummyUsers[3] = Meteor.users.insert({
    emails: [{ address: 'baltapeter@demo.com', verified: true }],
    profile: { lastName: 'Balta', firstName: 'Péter' },
    avatar: 'http://pannako.hu/wp-content/uploads/avatar-5.png',
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
    ownership: {
      serial: 1,
      share: 85,
      floor: 'I',
      number: '14',
      type: 'Apartment',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[2],
    role: 'owner',
    ownership: {
      serial: 2,
      share: 64,
      floor: 'II',
      number: '25',
      type: 'Apartment',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[3],
    role: 'owner',
    ownership: {
      serial: 3,
      share: 112,
      floor: 'III',
      number: '36',
      type: 'Apartment',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    userId: dummyUsers[3],
    role: 'owner',
    ownership: {
      serial: 101,
      share: 5,
      floor: '-2',
      number: 'P209',
      type: 'Parking',
    },
  });

  // The demo users comment one after the other, round robin style
  let nextUserIndex = 0;
  function nextUser() {
    nextUserIndex %= dummyUsers.length;
    return dummyUsers[nextUserIndex++];
  }

  // Forum
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


  let timestamp = (new Date()).getTime();

  data.forEach((topic) => {
    const topicId = Topics.insert({
      communityId: demoCommunityId,
      userId: nextUser(),
      category: 'forum',
      title: topic.title,
      text: topic.text,
      unreadCount: topic.items.length,
    });

    topic.items.forEach((text) => {
      Comments.insert({
        topicId,
        userId: nextUser(),
        text,
        createdAt: new Date(timestamp),
      });

      timestamp += 1; // ensure unique timestamp.
    });
  });

  // News
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

  // Votes
  Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: 'Fundamenta hitel felvétele',
    text: 'Felvegyük-e az 5 millio forintos Fundamenta hitelt 15 évre 6%-os kamattal.',
    vote: {
      closesAt: moment().subtract(10, 'day').toDate(),
    },
  });

  Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: 'Kerékpár tároló létesítéséről',
    text: 'Létesítsen-e a ház kerékpár tárolót maximum 200,000 Ft-ból a garázsszinten.\n' +
          'Elfogadás esetén három különböző árajánlatot kérünk be, és a legjobbat választjuk.',
    vote: {
      closesAt: moment().add(2, 'week').toDate(),
    },
  });

  const voteTopicId = Topics.insert({
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

  Comments.insert({
    topicId: voteTopicId,
    userId: nextUser(),
    text: 'A halovány színek jobban mutatnak. Világosabb hatású lesz a lépcsőház.',
    createdAt: new Date(timestamp),
  });

  Comments.insert({
    topicId: voteTopicId,
    userId: nextUser(),
    text: 'Jajj csak szürke NE legyen. Akkor költözöm.',
    createdAt: new Date(timestamp),
  });
});
