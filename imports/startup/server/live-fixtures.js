import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';

// import { insertDemoFixture } from '/imports/api/fixtures.js';
import { insertDemoHouse, insertLoginableUsersWithRoles, deleteDemoUsersAfterRestart } from '/imports/api/demohouse.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  const languages = TAPi18n.getLanguages();
  Object.keys(languages).forEach((lang) => {
  // insertDemoFixture(lang);
    insertDemoHouse(lang, 'demo');
    insertDemoHouse(lang, 'test');
    insertLoginableUsersWithRoles(lang, 'test');
  });
  deleteDemoUsersAfterRestart();
});
