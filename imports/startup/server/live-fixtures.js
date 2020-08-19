import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';

import { Log } from '/imports/utils/log.js';
import { insertDemoHouse, schedulePurgeExpiringDemoUsers } from '/imports/fixture/demohouse.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  if (Meteor.settings.resetDemo) {
    Log.info('Purging all demo users...');
    Meteor.users.remove({ 'emails.0.address': { $regex: /demo|test/ } });
  }
  const languages = TAPi18n.getLanguages();
  Object.keys(languages).forEach((lang) => {
    if (Meteor.settings.public.enableDemo) {
      insertDemoHouse(lang, 'demo');
      schedulePurgeExpiringDemoUsers(lang, 'demo');
    }
    if (Meteor.settings.public.enableTest) {
      insertDemoHouse(lang, 'test');
    }
  });
});
