import { Meteor } from 'meteor/meteor';
import { Topics } from '../../api/topics/topics.js';
import { Comments } from '../../api/comments/comments.js';

import { Communities } from '../../api/communities/communities.js';
import { Memberships } from '../../api/memberships/memberships.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  let demoCommunityId;
  if (Communities.find().count() === 0) {
    demoCommunityId = Communities.insert({
      name: 'Teszt ház',
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
  }

  let dummyUser1, dummyUser2, dummyUser3, dummyManager;
  if (!Meteor.users.findOne('demo')) {
    Meteor.users.insert({
      _id: 'demo',
      emails: [{ address: 'demouser@demo.com', verified: true }],
    });
    dummyUser1 = Meteor.users.insert({
      emails: [{ address: 'bajorandor@demo.com', verified: true }],
      profile: { lastName: 'Bajor', firstName: 'Andor' },
    });
    dummyUser2 = Meteor.users.insert({
      emails: [{ address: 'bakocsitimea@demo.com', verified: true }],
      profile: { lastName: 'Bakocsi', firstName: 'Tímea' },
    });
    dummyUser3 = Meteor.users.insert({
      emails: [{ address: 'baltapeter@demo.com', verified: true }],
      profile: { lastName: 'Balta', firstName: 'Péter' },
    });
    dummyManager = Meteor.users.insert({
      emails: [{ address: 'baltazarimre@demo.com', verified: true }],
      profile: { lastName: 'Baltazár', firstName: 'Imre' },
    });

    Memberships.insert({
      communityId: demoCommunityId,
      userId: dummyUser1,
      role: 'admin',
    });
    Memberships.insert({
      communityId: demoCommunityId,
      userId: dummyManager,
      role: 'manager',
    });
    Memberships.insert({
      communityId: demoCommunityId,
      userId: dummyUser1,
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
      userId: dummyUser2,
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
      userId: dummyUser3,
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
      userId: dummyUser3,
      role: 'owner',
      ownership: {
        serial: 101,
        share: 5,
        floor: '-2',
        number: 'P209',
        type: 'Parking',
      },
    });
  }

  if (Topics.find().count() === 0) {
    const data = [
      {
        name: 'Zár probléma',
        items: [
          'Múlt héten megint benyomták a kaput, és azóta nem jól záródik a zár',
          'Igen, már bejelentettem. Jövő héten tudnak csak jönni javítani',
        ],
      },
      {
        name: 'Hangos kutya a negyediken',
        items: [
          'A negyediken a kutya egész álló nap vonyít. Szólni kéne a gazdinak, hogy ne hagyja egyedül.',
          'Engem is rohadtul idegesít!!!',
          'Elnézést kérek a lakóktól. Enyém a kutyus, nem szokott vonyítani, csak a nagyi kórházban volt. De már itthon van.',
        ],
      },
      {
        name: 'Fundamenta hitel',
        items: [
          'Most kedvezményes feltételekkel lehet felvenni fundamenta hitelt tatarozásra.',
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
        name: topic.name,
        unreadCount: topic.items.length,
      });

      topic.items.forEach((text) => {
        Comments.insert({
          topicId,
          text,
          createdAt: new Date(timestamp),
        });

        timestamp += 1; // ensure unique timestamp.
      });
    });
  }
});
