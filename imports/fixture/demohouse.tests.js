import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { TAPi18n } from 'meteor/tap:i18n';
import '/i18n/demo.en.i18n.json';
import { Clock } from '/imports/utils/clock.js';
import { insertDemoHouse, insertLoginableUsersWithRoles, insertLoadsOfFakeMembers, schedulePurgeExpiringDemoUsers } from '/imports/fixture/demohouse.js';

if (Meteor.isServer) {

  let demoHouseId;
  let demoUserEmail;

  describe('demohouse', function () {
    this.timeout(100000);
    before(function () {
      demoHouseId = insertDemoHouse('en', 'demo');
    });

    describe('demouser', function () {
      it('can create demouser', function (done) {
        demoUserEmail = Meteor.call('createDemoUserWithParcel', 'en');
        chai.assert.isDefined(demoUserEmail);
        const demoUser = Meteor.users.findOne({ 'emails.0.address': demoUserEmail });
        chai.assert.isDefined(demoUser);
        done();
      });

      it('purges expiring demouser', function (done) {
        schedulePurgeExpiringDemoUsers('en', 'demo', 0);
        Meteor.setTimeout(function () {
          chai.assert.isUndefined(Meteor.users.findOne({ 'emails.0.address': demoUserEmail }));
          done();
        }, 1000);
      });
    });
  });
}
