/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture, newFixture, logDB } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Partners } from '/imports/api/transactions/partners/partners.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import '/imports/api/transactions/bills/methods.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';
import '/imports/api/transactions/payments/methods.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { Statements } from './statements/statements.js';
import './statements/methods.js';
import { StatementEntries } from './statement-entries/statement-entries.js';
import './statement-entries/methods.js';
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
          relation: 'supplier',
          partnerId: FixtureA.supplier,
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
        chai.assert.equal(bill.isConteered(), false);
        chai.assert.equal(bill.partner().outstanding, 300);
      });

      it('Can not conteer without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Bills.methods.conteer, { _id: billId });
        }, 'Bill has to be conteered first');
      });

      it('Can not registerPayment without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.create('payment', { relation: 'supplier', billId, amount: 300, valueDate: Clock.currentTime() });
        }, 'Bill has to be conteered first');
      });

      it('Can conteer - creates tx in accountig', function () {
        FixtureA.builder.execute(Bills.methods.update, { _id: billId, modifier: { $set: { 'lines.0.account': '85', 'lines.0.localizer': '@' } } });
        FixtureA.builder.execute(Bills.methods.conteer, { _id: billId });
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.isConteered(), true);
        const tx = Transactions.findOne(billId);
        chai.assert.isDefined(tx);
        chai.assert.equal(tx.dataType, 'bills');
        chai.assert.equal(tx.amount, 300);
        chai.assert.deepEqual(tx.debit, [{ amount: 300, account: '85', localizer: '@' }]);
        chai.assert.deepEqual(tx.credit, [{ account: '46' }]);
      });

      it('Can register Payments', function () {
        const bankAccount = '31';
        const paymentId1 = FixtureA.builder.create('payment',
          { relation: 'supplier', billId, amount: 100, valueDate: Clock.currentTime(), account: bankAccount },
        );
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 1);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200);

        const paymentId2 = FixtureA.builder.create('payment',
          { relation: 'supplier', billId, amount: 200, valueDate: Clock.currentTime(), account: bankAccount },
        );
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 2);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 0);

        let tx1 = Transactions.findOne(paymentId1);
        chai.assert.isUndefined(tx1);
        let tx2 = Transactions.findOne(paymentId2);
        chai.assert.isUndefined(tx2);

        FixtureA.builder.execute(Payments.methods.conteer, { _id: paymentId1 });
        tx1 = Transactions.findOne(paymentId1);
        chai.assert.isDefined(tx1);
        chai.assert.equal(tx1.dataType, 'payments');
        chai.assert.equal(tx1.amount, 100);
        chai.assert.deepEqual(tx1.debit, [{ account: '46' }]);
        chai.assert.deepEqual(tx1.credit, [{ account: bankAccount }]);

        FixtureA.builder.execute(Payments.methods.conteer, { _id: paymentId2 });
        tx2 = Transactions.findOne(paymentId2);
        chai.assert.isDefined(tx2);
        chai.assert.equal(tx2.dataType, 'payments');
        chai.assert.equal(tx2.amount, 200);
        chai.assert.deepEqual(tx2.debit, [{ account: '46' }]);
        chai.assert.deepEqual(tx2.credit, [{ account: bankAccount }]);
      });
    });

    describe('bills payments', function () {
      let billId;
      let bill;
      let statementId;
      let entryId1, entryId2, entryId3;
      let entry1, entry2, entry3;
      const bankAccount = '31';

      beforeEach(function () {
        billId = FixtureA.builder.create('bill', {
          relation: 'supplier',
          partnerId: FixtureA.supplier,
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '85',
            localizer: '@',
          }],
        });
        FixtureA.builder.execute(Bills.methods.conteer, { _id: billId });
        bill = Bills.findOne(billId);

        statementId = FixtureA.builder.create('statement', {
          account: bankAccount,
          startDate: moment().subtract(1, 'month').toDate(),
          endDate: new Date(),
          startBalance: 0,
          endBalance: 100,
        });
        entryId1 = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: moment().subtract(3, 'week').toDate(),
          partner: 'CUSTOMER',
          amount: 100,
          statementId,
        });
        entryId2 = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: moment().subtract(2, 'week').toDate(),
          partner: 'SUPPLIER',
          amount: -1000,
          statementId,
        });
        entryId3 = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: moment().subtract(1, 'week').toDate(),
          partner: 'CUSTOMER',
          amount: 200,
          statementId,
        });
      });

      it('Can pay bill manually', function () {
        FixtureA.builder.create('payment',
          { relation: 'supplier', billId, amount: 100, valueDate: Clock.currentTime(), account: bankAccount },
        );
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 1);
        chai.assert.equal(bill.getPayments()[0].isReconciled(), false);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200);

        // later if the same tx comes in from bank import, no extra payment is created
        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId1, paymentId: bill.payments[0] });
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 1);
        chai.assert.equal(bill.getPayments()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200);
      });

      it('Can pay bill from bank import', function () {
        entry1 = StatementEntries.findOne(entryId1);
        chai.assert.equal(entry1.isReconciled(), false);

        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId1, billId });
        entry1 = StatementEntries.findOne(entryId1);
        chai.assert.equal(entry1.isReconciled(), true);
        bill = Bills.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.payments.length, 1);
        chai.assert.equal(bill.getPayments()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 400);  // prev test billed the same partner!
      });
    });

/*
    xdescribe('transactions reconcile', function () {
      before(function () {
      });

      it('Reconcile and Conteer in one step', function () {
        const billId = Fixture.builder.create('bill', { relation: 'supplier', amount: 650 });
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
        const billId = Fixture.builder.create('bill', { relation: 'supplier', amount: 650 });
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
        const bill1Id = Fixture.builder.create('bill', { relation: 'supplier', amount: 650 });
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
        const bill1Id = Fixture.builder.create('bill', { relation: 'supplier', amount: 650 });
        const bill2Id = Fixture.builder.create('bill', { relation: 'supplier', amount: 350 });
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
        const bill1Id = Fixture.builder.create('bill', { relation: 'customer', amount: 650 });
        const bill2Id = Fixture.builder.create('bill', { relation: 'customer', amount: 350 });
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
