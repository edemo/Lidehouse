/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import '/imports/api/transactions/bills/methods.js';
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

      it('Reconcile one Bill - one Payment', function () {
        const bill1Id = Fixture.builder.create('bill', { category: 'in', amount: 650 });
        const tx1Id = Fixture.builder.create('tx', { amount: 650 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id });

        const bill1 = Bills.findOne(bill1Id);
        const tx1 = Transactions.findOne(tx1Id);
        chai.assert.equal(bill1.outstanding, 0);
        chai.assert.isTrue(tx1.reconciled);
        chai.assert.isTrue(tx1.complete);
      });

      it('Reconcile one Bill - multi Payment', function () {
        const bill1Id = Fixture.builder.create('bill', { category: 'in', amount: 650 });
        const tx1Id = Fixture.builder.create('tx', { amount: 100 });
        const tx2Id = Fixture.builder.create('tx', { amount: 200 });
        const tx3Id = Fixture.builder.create('tx', { amount: 350 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx2Id });

        const bill1 = Bills.findOne(bill1Id);
        const tx1 = Transactions.findOne(tx1Id);
        const tx2 = Transactions.findOne(tx2Id);
        chai.assert.equal(bill1.outstanding, 350);
        chai.assert.isTrue(tx1.reconciled);
        chai.assert.isTrue(tx1.complete);
        chai.assert.isTrue(tx2.reconciled);
        chai.assert.isTrue(tx2.complete);

        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx3Id });

        const tx3 = Transactions.findOne(tx3Id);
        chai.assert.equal(bill1.outstanding, 0);
        chai.assert.isTrue(tx3.reconciled);
        chai.assert.isTrue(tx3.complete);
      });

      it('Reconcile multi Bill - one Payment', function () {
        const bill1Id = Fixture.builder.create('bill', { category: 'in', amount: 650 });
        const bill2Id = Fixture.builder.create('bill', { category: 'in', amount: 350 });
        const tx1Id = Fixture.builder.create('tx', { amount: 1000 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill2Id, txId: tx1Id });

        const bill1 = Bills.findOne(bill1Id);
        const bill2 = Bills.findOne(bill2Id);
        const tx1 = Transactions.findOne(tx1Id);
        chai.assert.equal(bill1.outstanding, 0);
        chai.assert.equal(bill2.outstanding, 0);
        chai.assert.isTrue(tx1.reconciled);
        chai.assert.isTrue(tx1.complete);
      });

      it('Reconcile multi Bill - multi Payment ', function () {
        const bill1Id = Fixture.builder.create('bill', { category: 'out', amount: 650 });
        const bill2Id = Fixture.builder.create('bill', { category: 'out', amount: 350 });
        const tx1Id = Fixture.builder.create('tx', { amount: 200 });
        const tx2Id = Fixture.builder.create('tx', { amount: 800 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id, amount: 100 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill2Id, txId: tx1Id, amount: 100 });

        let bill1 = Bills.findOne(bill1Id);
        let bill2 = Bills.findOne(bill2Id);
        let tx1 = Transactions.findOne(tx1Id);
        let tx2 = Transactions.findOne(tx2Id);
        chai.assert.equal(bill1.outstanding, 550);
        chai.assert.equal(bill2.outstanding, 250);
        chai.assert.isTrue(tx1.reconciled);
        chai.assert.isTrue(tx1.complete);
        chai.assert.isFalse(tx2.reconciled);
        chai.assert.isFalse(tx2.complete);

        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx2Id });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill2Id, txId: tx2Id });

        bill1 = Bills.findOne(bill1Id);
        bill2 = Bills.findOne(bill2Id);
        tx1 = Transactions.findOne(tx1Id);
        tx2 = Transactions.findOne(tx2Id);
        chai.assert.equal(bill1.outstanding, 550);
        chai.assert.equal(bill2.outstanding, 250);
        chai.assert.isTrue(tx1.reconciled);
        chai.assert.isTrue(tx1.complete);
        chai.assert.isFalse(tx2.reconciled);
        chai.assert.isFalse(tx2.complete);

      });
    });
  });
}
