/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Bills } from './bills/bills.js';
import { ParcelBillings } from './batches/parcel-billings.js';
import { insert } from './methods.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js'

if (Meteor.isServer) {
  let Fixture;

  describe('transactions', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });
    after(function () {
    });

    describe('bills payments', function () {
      before(function () {
      });

      it('Scenario one Bill - one Payment', function () {
        const bill1Id = Fixture.builder.create('bill', { category: 'in', amount: 500 });
        const tx1Id = Fixture.builder.create('tx', { amount: 500 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id });

        const bill1 = Bills.findOne(bill1Id);
        const tx1 = Transactions.findOne(tx1Id);
        chai.assert.equal(bill1.outstanding, 0);
        chai.assert.isTrue(tx1.reconciled);
        chai.assert.isTrue(tx1.complete);
      });

      it('Scenario one Bill - multi Payment', function () {
      });

      it('Scenario multi Bill - one Payment', function () {
      });

      it('Scenario multi Bill - multi Payment ', function () {
      });
    });
  });
}
