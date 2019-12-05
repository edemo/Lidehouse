import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { TAPi18n } from 'meteor/tap:i18n';
import '/i18n/demo.en.i18n.json';
import { insertDemoHouse, insertLoginableUsersWithRoles, insertLoadsOfFakeMembers, purgeExpiringDemoUsers } from '/imports/fixture/demohouse.js';



if (Meteor.isServer) {

  let demoHouse;

  describe('demohouse', function () {
    this.timeout(100000);
    before(function () {
      demoHouse = insertDemoHouse('en', 'demo');
    });

    describe('demouser', function () {
      it('can create demouser', function (done) {
        const demoUserEmail = Meteor.call('createDemoUserWithParcel', 'en');
        chai.assert.isDefined(demoUserEmail);
        done();
      });
    });
  });
}
