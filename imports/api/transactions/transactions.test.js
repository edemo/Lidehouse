/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture, newFixture, logDB } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import '/imports/api/transactions/bills/methods.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

import '/imports/startup/server/validated-method.js';   // TODO Where to put this? - in a common place
import { Communities } from '../communities/communities';

if (Meteor.isServer) {
  let FixtureA; //, FixtureC;

  describe('transactions', function () {
    this.timeout(5000);
    before(function () {
//      FixtureC = freshFixture('Cash accounting house');
      FixtureA = freshFixture();
      Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.accountingMethod': 'accrual' } });
    });
    after(function () {
    });


    describe('Bills lifecycle with accrual method', function () {
      let billId;
      let bill;
      before(function () {
        billId = FixtureA.builder.create('bill', {
          category: 'in',
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
//            account: '85',
//            localizer: '@',
          }],
        });
      });

      it('Can create without accounts', function () {
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 0);
        chai.assert.equal(bill.outstanding, 300);
        chai.assert.isUndefined(bill.txId);
      });

      it('Can not conteer without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Bills.methods.conteer, { _id: billId }, FixtureA.builder.getUserWithRole('accountant'));
        }, 'Bill has to be conteered first');
      });

      it('Can not registerPayment without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Bills.methods.registerPayment, { _id: billId, payment: { amount: 300, valueDate: Clock.currentTime() } }, FixtureA.builder.getUserWithRole('accountant'));
        }, 'Bill has to be conteered first');
      });

      it('Can conteer - creates tx in accountig', function () {
        FixtureA.builder.execute(Bills.methods.update, { _id: billId, modifier: { $set: { 'lines.0.account': '85', 'lines.0.localizer': '@' } } });
        FixtureA.builder.execute(Bills.methods.conteer, { _id: billId }, FixtureA.builder.getUserWithRole('accountant'));
        bill = Bills.findOne(billId);
        chai.assert.isDefined(bill.txId);
        const tx = Transactions.findOne(bill.txId);
        chai.assert.isDefined(tx);
        chai.assert.equal(tx.billId, billId);
        chai.assert.equal(tx.amount, 300);
        chai.assert.deepEqual(tx.debit, [{ amount: 300, account: '85', localizer: '@' }]);
        chai.assert.deepEqual(tx.credit, [{ account: '46' }]);
      });

      it('Can register Payments', function () {
        const bankAccount = '31';
        FixtureA.builder.execute(Bills.methods.registerPayment,
          { _id: billId, payment: { amount: 100, valueDate: Clock.currentTime(), account: bankAccount } },
          FixtureA.builder.getUserWithRole('accountant')
        );
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 1);
        chai.assert.equal(bill.outstanding, 200);

        FixtureA.builder.execute(Bills.methods.registerPayment,
          { _id: billId, payment: { amount: 200, valueDate: Clock.currentTime(), account: bankAccount } },
          FixtureA.builder.getUserWithRole('accountant')
        );
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 2);
        chai.assert.equal(bill.outstanding, 0);

        const tx1 = Transactions.findOne({ billId, paymentId: 0 });
        chai.assert.isDefined(tx1);
        chai.assert.equal(tx1.amount, 100);
        chai.assert.deepEqual(tx1.debit, [{ account: '46' }]);
        chai.assert.deepEqual(tx1.credit, [{ account: bankAccount }]);

        const tx2 = Transactions.findOne({ billId, paymentId: 1 });
        chai.assert.isDefined(tx2);
        chai.assert.equal(tx2.amount, 200);
        chai.assert.deepEqual(tx2.debit, [{ account: '46' }]);
        chai.assert.deepEqual(tx2.credit, [{ account: bankAccount }]);
      });
    });

    describe('bills payments', function () {
      let billId;
      let bill;
      let bankstatement;
      const bankAccount = '31';

      beforeEach(function () {
        billId = FixtureA.builder.create('bill', {
          category: 'in',
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '85',
            localizer: '@',
          }],
        });
        FixtureA.builder.execute(Bills.methods.conteer, { _id: billId }, FixtureA.builder.getUserWithRole('accountant'));
        bill = Bills.findOne(billId);

        bankstatement = FixtureA.builder.create('bankstatement', {
          startDate: moment().subtract(1, 'month').toDate(),
          endDate: new Date(),
          startBalance: 0,
          endBalance: 100,
          account: bankAccount,
          entries: [{
            valueDate: moment().subtract(3, 'week').toDate(),
            partner: 'CUSTOMER',
            amount: 100,
          }, {
            valueDate: moment().subtract(2, 'week').toDate(),
            partner: 'SUPPLIER',
            amount: -1000,
          }, {
            valueDate: moment().subtract(1, 'week').toDate(),
            partner: 'CUSTOMER',
            amount: 200,
          }],
        });
      });

      it('Can pay bill manually', function () {
        FixtureA.builder.execute(Bills.methods.registerPayment,
          { _id: billId, payment: { amount: 100, valueDate: Clock.currentTime(), account: bankAccount } },
          FixtureA.builder.getUserWithRole('accountant')
        );
        bill = Bills.findOne(billId);

        // later if the same tx comes in from bank import, no extra payment is created
      });

      it('Can pay bill from bank import', function () {
      });
    });

/*
    xdescribe('transactions reconcile', function () {
      before(function () {
      });

      it('Reconcile and Conteer in one step', function () {
        const billId = Fixture.builder.create('bill', { category: 'in', amount: 650 });
        const txId = Fixture.builder.create('tx', { amount: 650, debit: [{ account: '38', localizer: '@' }] });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId, txId });

        const bill = Bills.findOne(billId);
        const tx = Transactions.findOne(txId);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.account, '38');
        chai.assert.equal(bill.localizer, '@');
        chai.assert.isTrue(tx.reconciled);
        chai.assert.isTrue(tx.complete);
      });

      it('Conteer first, Reconcile later', function () {
        const billId = Fixture.builder.create('bill', { category: 'in', amount: 650 });
        const txId = Fixture.builder.create('tx', { amount: 650, debit: [{ account: '38', localizer: '@' }] });

        Fixture.builder.execute(Bills.methods.conteer, { _id: billId, modifier: { $set: { account: '38', localizer: '@' } } });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId, txId });

        const bill = Bills.findOne(billId);
        const tx = Transactions.findOne(txId);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.account, '38');
        chai.assert.equal(bill.localizer, '@');
        chai.assert.isTrue(tx.reconciled);
        chai.assert.isTrue(tx.complete);
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
    });*/

  });
}
