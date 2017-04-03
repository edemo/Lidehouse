import { Meteor } from 'meteor/meteor';
import { Topics } from '../../api/topics/topics.js';
import { Comments } from '../../api/comments/comments.js';

import { Communities } from '../../api/communities/communities.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
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
        name: topic.name,
        incompleteCount: topic.items.length,
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
  if (Communities.find().count() === 0) {
    Communities.insert({
      name: 'Bazsalikom u 27',
    });
  }
  if (Meteor.users.find({ username: 'dummy' }).count === 0) {
    Meteor.users.insert({ username: 'dummy', email: 'dummy@dummy.net' });
    Meteor.users.insert({ username: 'dummy1', email: 'dummy1@dummy.net' });
    Meteor.users.insert({ username: 'dummy2', email: 'dummy2@dummy.net' });
  }
});
