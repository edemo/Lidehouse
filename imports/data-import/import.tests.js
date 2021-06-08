/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import '/imports/startup/both/fractional.js';  // TODO: should be automatic, but not included in tests

import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { getConductor } from '/imports/data-import/conductors.js';
import { digestImportJsons } from '/imports/data-import/digest.js';

if (Meteor.isServer) {
  let Fixture;

  describe('import', function () {
    this.timeout(150000);
    before(function () {
      Fixture = freshFixture();
      const mockModalStack = {
        communityId: Fixture.demoCommunityId,
      };
      ModalStack.getVar = (name) => mockModalStack[name];
    });

    describe('parcel import', function () {
      let phase;

      before(function () {
        const conductor = getConductor(Parcels, { format: 'default' });
        phase = conductor.nextPhase();
      });

      after(function () {
        Parcels.remove({ communityId: Fixture.demoCommunityId, building: 'B' });
      });

      it('can import new docs', function () {
        const jsons = [{
          communityId: Fixture.demoCommunityId,
          ref: 'B52',
          building: 'B',
          area: 52,
        }, {
          communityId: Fixture.demoCommunityId,
          ref: 'B69',
          building: 'B',
          area: 69,
        }];
        const digest = digestImportJsons(jsons, phase);

        const testResult = Parcels.methods.batch.test._execute({ userId: Fixture.demoAdminId }, { args: digest.tdocs });
        chai.assert.equal(testResult.insert.length, 2);
        chai.assert.equal(testResult.update.length, 0);

        Parcels.methods.batch.upsert._execute({ userId: Fixture.demoAdminId }, { args: digest.tdocs });
        const parcel1 = Parcels.findOne({ communityId: Fixture.demoCommunityId, ref: 'B52' });
        const parcel2 = Parcels.findOne({ communityId: Fixture.demoCommunityId, ref: 'B69' });
        chai.assert.equal(parcel1.area, 52);
        chai.assert.equal(parcel2.area, 69);
      });

      it('can modify fields on existing docs', function () {
        const jsons = [{
          communityId: Fixture.demoCommunityId,
          ref: 'B52',
          building: 'C',
        }, {
          communityId: Fixture.demoCommunityId,
          ref: 'B69',
          building: 'B',
        }];
        const digest = digestImportJsons(jsons, phase);

        const testResult = Parcels.methods.batch.test._execute({ userId: Fixture.demoAdminId }, { args: digest.tdocs });
        chai.assert.equal(testResult.insert.length, 0);
        chai.assert.equal(testResult.update.length, 1);

        Parcels.methods.batch.upsert._execute({ userId: Fixture.demoAdminId }, { args: digest.tdocs });
        const parcel1 = Parcels.findOne({ communityId: Fixture.demoCommunityId, ref: 'B52' });
        const parcel2 = Parcels.findOne({ communityId: Fixture.demoCommunityId, ref: 'B69' });
        chai.assert.equal(parcel1.building, 'C');
        chai.assert.equal(parcel1.area, 52);
        chai.assert.equal(parcel2.building, 'B');
        chai.assert.equal(parcel2.area, 69);
      });
    });

  });
}
