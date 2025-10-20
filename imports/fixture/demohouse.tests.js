/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Accounts } from 'meteor/accounts-base';
import '/i18n/demo.en.i18n.json';

import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
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

      describe('demohouse reset', function () {
        it('removes demohouse with its belongings and demousers (and builds new)', function (done) {
          Meteor.settings.resetDemo = true;
          const nonDemoUserId = Accounts.createUser({ email: 'newuser@notademoemailaddress.com', password: 'password' });
          let demoAdmin = Memberships.findOne({ communityId: demoHouseId, role: 'admin' });
          const demoAdminUser = Meteor.users.findOne({ 'emails.0.address': 'admin@demo.com' });
          chai.assert.isDefined(demoAdmin);
          chai.assert.isDefined(demoAdminUser);
          chai.assert.isAbove(Parcels.find({ communityId: demoHouseId }).count(), 10);
          chai.assert.isAbove(Topics.find({ communityId: demoHouseId }).count(), 10);
          chai.assert.isAbove(Transactions.find({ communityId: demoHouseId }).count(), 100);
          chai.assert.isAbove(Meters.find({ communityId: demoHouseId }).count(), 10);
          chai.assert.isAbove(Partners.find({ communityId: demoHouseId }).count(), 10);

          const newDemoHouseId = insertDemoHouse('en', 'demo');
          chai.assert.notEqual(demoHouseId, newDemoHouseId);
          demoAdmin = Memberships.findOne({ communityId: demoHouseId, role: 'admin' });
          const newDemoAdmin = Memberships.findOne({ communityId: newDemoHouseId, role: 'admin' });
          const newDemoAdminUser = Meteor.users.findOne({ 'emails.0.address': 'admin@demo.com' });
          const nonDemoUser = Meteor.users.findOne(nonDemoUserId);
          chai.assert.isUndefined(Communities.findOne(demoHouseId));
          chai.assert.isUndefined(demoAdmin);
          chai.assert.isDefined(nonDemoUser);
          chai.assert.isDefined(newDemoAdminUser);
          chai.assert.notEqual(demoAdminUser._id, newDemoAdminUser._id);
          chai.assert.isDefined(newDemoAdmin);
          chai.assert.equal(Transactions.find({ communityId: demoHouseId }).count(), 0);
          Mongo.Collection.getAll().forEach((collection) => {
            if (collection.name === 'trash') return;
            chai.assert.equal(collection.instance.find({ communityId: demoHouseId }).count(), 0);
          });
          delete Meteor.settings.resetDemo;
          done();
        });
      });
    });
  });
}
