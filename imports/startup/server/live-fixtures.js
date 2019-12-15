import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';

import { insertDemoHouse, insertLoginableUsersWithRoles, insertLoadsOfFakeMembers, scheduePurgeExpiringDemoUsers } from '/imports/fixture/demohouse.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  if (Meteor.settings.reset) {
    console.log('Purging all demo users...');
    Meteor.users.remove({ 'emails.0.address': { $regex: /demo|test/ } });
  }
  const languages = TAPi18n.getLanguages();
  Object.keys(languages).forEach((lang) => {
    if (Meteor.settings.enableDemo) {
      insertDemoHouse(lang, 'demo');
      scheduePurgeExpiringDemoUsers(lang, 'demo');
    }
    if (Meteor.settings.enableTest) {
      insertDemoHouse(lang, 'test');
    }
  });
});
