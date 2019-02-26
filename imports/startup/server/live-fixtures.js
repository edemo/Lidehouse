import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';

// import { insertDemoFixture } from '/imports/fixture/fixtures.js';
import { insertDemoHouse, insertLoginableUsersWithRoles, insertLoadsOfDummyData, deleteDemoUsersAfterRestart } from '/imports/fixture/demohouse.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  const languages = TAPi18n.getLanguages();
  Object.keys(languages).forEach((lang) => {
  // insertDemoFixture(lang);
    if (Meteor.settings.enableDemo) {
      insertDemoHouse(lang, 'demo');
      deleteDemoUsersAfterRestart(lang, 'demo');
    }
    if (Meteor.settings.enableTest) {
      insertDemoHouse(lang, 'test');
      insertLoginableUsersWithRoles(lang, 'test');
//      insertLoadsOfDummyData(lang, 'test', 1000);
    }
  });
});
