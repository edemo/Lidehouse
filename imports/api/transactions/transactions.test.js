/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Statements } from '/imports/api/transactions/statements/statements.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';


if (Meteor.isServer) {
  let FixtureA; //, FixtureC;

  describe('transactions', function () {
    this.timeout(15000);
    before(function () {
//      FixtureC = freshFixture('Cash accounting house');
      FixtureA = freshFixture();
      Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.accountingMethod': 'accrual' } });
    });
    after(function () {
    });

    describe('Bills api', function () {
      let billId;
      let bill;
      before(function () {
        const partnerId = FixtureA.partnerId(FixtureA.dummyUsers[1]);
        billId = FixtureA.builder.create('bill', {
          relation: 'member',
          partnerId,
          membershipId: Memberships.findOne({ partnerId })._id,
          issueDate: new Date('2018-01-05'),
          deliveryDate: new Date('2018-01-02'),
          dueDate: new Date('2018-01-30'),
          lines: [{
            title: 'Work 1',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            localizer: '@AP01',
            parcelId: FixtureA.dummyParcels[1],
          }, {
            title: 'Work 2',
            uom: 'month',
            quantity: 2,
            unitPrice: 500,
            localizer: '@AP02',
            parcelId: FixtureA.dummyParcels[2],
          }],
        });
      });
      after(function () {
        Transactions.remove(billId);
      });

      it('Fills calculated values correctly', function () {
        bill = Transactions.findOne(billId);
    
        chai.assert.equal(bill.lines.length, 2);
        chai.assert.equal(bill.lines[0].amount, 300);
        chai.assert.equal(bill.lines[1].amount, 1000);
        chai.assert.equal(bill.amount, 1300);
        chai.assert.equal(bill.valueDate.getTime(), bill.deliveryDate.getTime());
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.isPosted(), false);

        chai.assert.equal(bill.outstanding, 1300);
        chai.assert.equal(bill.partner().outstanding, 1300);
        chai.assert.equal(bill.membership().outstanding, 1300);
        const parcel1 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP01' });
        const parcel2 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP02' });
        chai.assert.equal(parcel1.outstanding, 300);
        chai.assert.equal(parcel2.outstanding, 1000);
      });
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
          }],
        });
      });

      it('Can create without accounts', function () {
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.isPosted(), false);

        chai.assert.equal(bill.outstanding, 300);
        chai.assert.equal(bill.partner().outstanding, 300);
      });

      it('Can not post without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        }, 'Bill has to be conteered first');
      });

      it('Can not registerPayment without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 300 }], amount: 300, valueDate: Clock.currentTime() });
        }, 'Bill has to be conteered first');
      });

      it('Can post - creates tx in accountig', function () {
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: { $set: { 'lines.0.account': '`861', 'lines.0.localizer': '@' } } });
        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.isPosted(), true);
        const tx = Transactions.findOne(billId);
        chai.assert.isDefined(tx);
        chai.assert.equal(tx.category, 'bill');
        chai.assert.equal(tx.amount, 300);
        chai.assert.deepEqual(tx.debit, [{ amount: 300, account: '`861', localizer: '@' }]);
        chai.assert.deepEqual(tx.credit, [{ amount: 300, account: '`454', localizer: '@' }]);
      });

      it('Can register Payments', function () {
        const bankAccount = '`381';
        const paymentId1 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, valueDate: Clock.currentTime(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200);

        const paymentId2 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, valueDate: Clock.currentTime(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 0);

        let tx1 = Transactions.findOne(paymentId1);
        chai.assert.equal(tx1.category, 'payment');
        chai.assert.equal(tx1.amount, 100);
        chai.assert.isFalse(tx1.isPosted());
        chai.assert.isUndefined(tx1.debit);
        chai.assert.isUndefined(tx1.credit);
        let tx2 = Transactions.findOne(paymentId2);
        chai.assert.equal(tx2.category, 'payment');
        chai.assert.equal(tx2.amount, 200);
        chai.assert.isFalse(tx2.isPosted());
        chai.assert.isUndefined(tx2.debit);
        chai.assert.isUndefined(tx2.credit);

        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId1 });
        tx1 = Transactions.findOne(paymentId1);
        chai.assert.isTrue(tx1.isPosted());
        chai.assert.deepEqual(tx1.debit, [{ amount: 100, account: '`454', localizer: '@' }]);
        chai.assert.deepEqual(tx1.credit, [{ amount: 100, account: bankAccount }]);

        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        tx2 = Transactions.findOne(paymentId2);
        chai.assert.isTrue(tx2.isPosted());
        chai.assert.deepEqual(tx2.debit, [{ amount: 200, account: '`454', localizer: '@' }]);
        chai.assert.deepEqual(tx2.credit, [{ amount: 200, account: bankAccount }]);
      });
    });

    describe('Bills payments reconciliation', function () {
      let billId;
      let bill;
//      let statementId;
      const bankAccount = '381';

      beforeEach(function () {
        billId = FixtureA.builder.create('bill', {
          relation: 'supplier',
          partnerId: FixtureA.supplier,
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '`861',
            localizer: '@',
          }],
        });
        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

/*        statementId = FixtureA.builder.create('statement', {
          account: bankAccount,
          startDate: moment().subtract(1, 'month').toDate(),
          endDate: new Date(),
          startBalance: 0,
          endBalance: 100,
        });
*/
      });
      afterEach(function () {
        Transactions.remove({});
      });

      it('Can pay bill by registering a payment tx - later a statementEntry will be matched to it', function () {
        FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), false);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200);

        const txId1 = bill.getPayments()[0].id;
        const entryId1 = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId1, txId: txId1 });

        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200);

        FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].isReconciled(), false);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 0);

        const txId2 = bill.getPayments()[1].id;
        const entryId2 = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -200,
        });
        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId2, txId: txId2 });
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 0);
      });

      it('Can NOT reconcile statementEntry with different relation, amount or date', function () {
        FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        const txId = bill.getPayments()[0].id;
/*        
        const entryIdWrongRelation = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Customer Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongRelation, txId });
        }, 'err_notAllowed');
*/
        const entryIdWrongAccount = FixtureA.builder.create('statementEntry', {
          account: bankAccount + '1',
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongAccount, txId });
        }, 'err_notAllowed');

        const entryIdWrongAmount = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -110,
        });
        chai.assert.throws(() => {
          FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongAmount, txId });
        }, 'err_notAllowed');

        const entryIdWrongSign = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: 100,
        });
        chai.assert.throws(() => {
          FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongSign, txId });
        }, 'err_notAllowed');

        const entryIdWrongDate = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: moment().subtract(3, 'week').toDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongDate, txId });
        }, 'err_notAllowed');
      });

      it('Can auto reconcile from bank import - exact amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -300,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

//        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId2 });
//        entry2 = StatementEntries.findOne(entryId2);
//        chai.assert.equal(entry2.match.billId, billId);
        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 0);
      });

      it('Can auto reconcile from bank import - rounded lower amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -298,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 2);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        FixtureA.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, FixtureA.demoAccountantId );
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: -2, account: '`99' }]
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
           [{ amount: 298, account: '381' }]
        );
      });

      it('Can auto reconcile from bank import - rounded higher amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = FixtureA.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -302,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        FixtureA.builder.execute(StatementEntries.methods.reconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, -2);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        FixtureA.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, FixtureA.demoAccountantId );
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: 2, account: '`99' }]
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
           [{ amount: 302, account: '381' }]
        );
      });
    });

/*
    xdescribe('transactions reconcile', function () {
      before(function () {
      });

      it('Reconcile and Conteer in one step', function () {
        const billId = Fixture.builder.create('bill', { relation: 'supplier', amount: 650 });
        const txId = Fixture.builder.create('transaction', { amount: 650, debit: [{ account: '`38', localizer: '@' }] });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId, txId });

        const bill = Transactions.findOne(billId);
        const tx = Transactions.findOne(txId);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.account, '`38');
        chai.assert.equal(bill.localizer, '@');
        chai.assert.isTrue(tx.reconciled);
        chai.assert.isTrue(tx.complete);
      });

      it('Conteer first, Reconcile later', function () {
        const billId = Fixture.builder.create('bill', { relation: 'supplier', amount: 650 });
        const txId = Fixture.builder.create('transaction', { amount: 650, debit: [{ account: '`38', localizer: '@' }] });

        Fixture.builder.execute(Transactions.methods.post, { _id: billId, modifier: { $set: { account: '`38', localizer: '@' } } });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId, txId });

        const bill = Transactions.findOne(billId);
        const tx = Transactions.findOne(txId);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.account, '`38');
        chai.assert.equal(bill.localizer, '@');
        chai.assert.isTrue(tx.reconciled);
        chai.assert.isTrue(tx.complete);
      });

      it('Reconcile one Bill - multi Payment', function () {
        const bill1Id = Fixture.builder.create('bill', { relation: 'supplier', amount: 650 });
        const tx1Id = Fixture.builder.create('transaction', { amount: 100 });
        const tx2Id = Fixture.builder.create('transaction', { amount: 200 });
        const tx3Id = Fixture.builder.create('transaction', { amount: 350 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx2Id });

        const bill1 = Transactions.findOne(bill1Id);
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
        const tx1Id = Fixture.builder.create('transaction', { amount: 1000 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill2Id, txId: tx1Id });

        const bill1 = Transactions.findOne(bill1Id);
        const bill2 = Transactions.findOne(bill2Id);
        const tx1 = Transactions.findOne(tx1Id);
        chai.assert.equal(bill1.outstanding, 0);
        chai.assert.equal(bill2.outstanding, 0);
        chai.assert.isTrue(tx1.reconciled);
        chai.assert.isTrue(tx1.complete);
      });

      it('Reconcile multi Bill - multi Payment ', function () {
        const bill1Id = Fixture.builder.create('bill', { relation: 'customer', amount: 650 });
        const bill2Id = Fixture.builder.create('bill', { relation: 'customer', amount: 350 });
        const tx1Id = Fixture.builder.create('transaction', { amount: 200 });
        const tx2Id = Fixture.builder.create('transaction', { amount: 800 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill1Id, txId: tx1Id, amount: 100 });
        Fixture.builder.execute(Transactions.methods.reconcile, { billId: bill2Id, txId: tx1Id, amount: 100 });

        let bill1 = Transactions.findOne(bill1Id);
        let bill2 = Transactions.findOne(bill2Id);
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

        bill1 = Transactions.findOne(bill1Id);
        bill2 = Transactions.findOne(bill2Id);
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
