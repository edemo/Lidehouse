import { Meteor } from 'meteor/meteor';
import { Topics } from '../../api/topics/topics.js';
import { Comments } from '../../api/comments/comments.js';

import { Communities } from '../../api/communities/communities.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  let demoCommunityId;
  if (Communities.find().count() === 0) {
    demoCommunityId = Communities.insert({
      name: 'Teszt ház',
      lot: '1234566/1234',
      address: {
        city: 'Budapest',
        street: 'Hernád u',
        number: '56',
        zip: '1078',
      },
    });
  }
/*
  if (!Meteor.users.findOne({ username: 'demo_user' })) {
    Meteor.users.insert([{
      username: 'demo_user',
      emails: [{ address: 'user@demo.com', verified: true }],
    }, {
      username: 'bajorandor',
      emails: [{ address: 'bajor@demo.com', verified: true }],
      profile: { lastName: 'Bajor', firstName: 'Andor' },
      roles: [{ name: 'admin', communityId: demoCommunityId }],
    }, {
      username: 'bakocsitimea',
      emails: [{ address: 'bakocsi@demo.com', verified: true }],
      profile: { lastName: 'Bakocsi', firstName: 'Tímea' },
    }, {
      username: 'baltapeter',
      emails: [{ address: 'balta@demo.com', verified: true }],
      profile: { lastName: 'Balta', firstName: 'Péter' },
    }]);
  }
*/
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
