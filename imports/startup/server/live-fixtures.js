import { Meteor } from 'meteor/meteor';
import { Communities } from '/imports/api/communities/communities.js';
import { insertDemoFixture } from '/imports/api/fixtures.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  console.log('>>> live fixtures');
  if (Communities.findOne({ name: 'Demo ház' })) {
    return; // if Demo data already populated
  }

  insertDemoFixture();
});
