import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { TAPi18n } from 'meteor/tap:i18n';
import '/i18n/demo.en.i18n.json';
import { Clock } from '/imports/utils/clock.js';
import { insertDemoHouse, insertLoginableUsersWithRoles, insertLoadsOfFakeMembers, DEMO_LIFETIME, scheduePurgeExpiringDemoUsers } from '/imports/fixture/demohouse.js';

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
        Clock.setSimulatedTime();
        demoUserEmail = Meteor.call('createDemoUserWithParcel', 'en');
        chai.assert.isDefined(demoUserEmail);
        const demoUser = Meteor.users.findOne({ 'emails.0.address': demoUserEmail });
        chai.assert.isDefined(demoUser);
        done();
      });

      it('purges expiring demouser', function (done) {
        Clock.tick(DEMO_LIFETIME); Clock.tick(1, 'day');
        scheduePurgeExpiringDemoUsers('en', 'demo');
        //chai.assert.isUndefined(Meteor.users.findOne({ 'emails.0.address': demoUserEmail }));
        done();
      });
    });
  });
}
