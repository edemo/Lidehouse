/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { TAPi18n } from 'meteor/tap:i18n';
import '/i18n/demo.en.i18n.json';
import { Clock } from '/imports/utils/clock.js';
import { Partners } from '/imports/api/partners/partners.js';
import { insertDemoHouse, schedulePurgeExpiringDemoUsers } from '/imports/fixture/demohouse.js';
import { emptyFixture } from '../api/test-utils';

if (Meteor.isServer) {
  let demoHouseId;
  let demoUser;
  let demoPartner;
  let demoParcel;
  let demoUserEmail;
  describe('demohouse', function () {
    this.timeout(3 * 60 * 1000);
    before(function () {
      emptyFixture();
      demoHouseId = insertDemoHouse('en', 'demo');
    });

    describe('demouser', function () {
      it('can create demouser', function (done) {
        demoUserEmail = Meteor.call('createDemoUserWithParcel', 'en');
        chai.assert.isDefined(demoUserEmail);
        demoUser = Meteor.users.findOne({ 'emails.0.address': demoUserEmail });
        chai.assert.isDefined(demoUser);
        demoPartner = Partners.findOne(demoUser.partnerId(demoHouseId));
        chai.assert.isDefined(demoPartner);
        const ownedParcels = demoUser.ownedParcels(demoHouseId);  // Should be without houseId param, because want to see in all communities, to see if this is the only one
        chai.assert.equal(ownedParcels.length, 1);
        demoParcel = ownedParcels[0];
        done();
      });

      it('purges expiring demouser', function (done) {
        schedulePurgeExpiringDemoUsers('en', 'demo', 0);
        Meteor.setTimeout(function () {
          chai.assert.isUndefined(Meteor.users.findOne({ 'emails.0.address': demoUserEmail }));
          Mongo.Collection.getAll().forEach((collection) => {
            if (collection.name === 'trash') return;
            const _collection = collection.instance;
//          TODO : ceck everything got removed ---  
//            const _schema = _collection.simpleSchema({})._schema;  // problem: simpleSchema() needs a doc now, it is entity type specific
//            if (_schema.creatorId) chai.assert.isUndefined(_collection.findOne({ creatorId: demoUser._id }));
//            if (_schema.partnerId) chai.assert.isUndefined(_collection.findOne({ partnerId: demoPartner._id }));
//            if (_schema.parcelId) chai.assert.isUndefined(_collection.findOne({ parcelId: demoParcel._id }));
          });
          done();
        }, 5000);
      });
    });
  });
}
