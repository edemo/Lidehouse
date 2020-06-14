/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';


if (Meteor.isServer) {
  let Fixture;

  describe('reconciliation', function () {
    this.timeout(15000);
    before(function () {
//      FixtureC = freshFixture('Cash accounting house');
      Fixture = freshFixture();
    });
    after(function () {
    });

    describe('Bills payments reconciliation', function () {
      let billId, billId2;
      let bill, bill2;
//      let statementId;
      const bankAccount = '`381';

      beforeEach(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        billId2 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          lines: [{
            title: 'The Work A',
            uom: 'piece',
            quantity: 1,
            unitPrice: 50,
            account: '`861',
            localizer: '@',
          }, {
            title: 'The Work B',
            uom: 'piece',
            quantity: 1,
            unitPrice: 150,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId2 });
        bill2 = Transactions.findOne(billId2);

/*        statementId = Fixture.builder.create('statement', {
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
        Fixture.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), false);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200 + 200);

        const txId1 = bill.getPayments()[0].id;
        const entryId1 = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId1, txId: txId1 });

        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200 + 200);

        Fixture.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].isReconciled(), false);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 200 + 0);

        const txId2 = bill.getPayments()[1].id;
        const entryId2 = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -200,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId2, txId: txId2 });
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 200 + 0);
      });

      it('Can NOT reconcile statementEntry with different relation, amount or date', function () {
        Fixture.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        const txId = bill.getPayments()[0].id;
/*        
        const entryIdWrongRelation = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Customer Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongRelation, txId });
        }, 'err_notAllowed');
*/
        const entryIdWrongAccount = Fixture.builder.create('statementEntry', {
          account: bankAccount + '1',
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongAccount, txId });
        }, 'err_notAllowed');

        const entryIdWrongAmount = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -110,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongAmount, txId });
        }, 'err_notAllowed');

        const entryIdWrongSign = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: 100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongSign, txId });
        }, 'err_notAllowed');

        const entryIdWrongDate = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: moment().subtract(3, 'week').toDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongDate, txId });
        }, 'err_notAllowed');
      });

      it('Can primary auto reconcile when bill serial provided - exact amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -300,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

//        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId2 });
//        entry2 = StatementEntries.findOne(entryId2);
//        chai.assert.equal(entry2.match.billId, billId);
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);
        chai.assert.equal(entry.match.confidence, 'primary');
        chai.assert.equal(entry.match.tx.category, 'payment');
        chai.assert.equal(entry.match.tx.amount, 300);
        chai.assert.deepEqual(entry.match.tx.bills, [{ id: billId, amount: 300 }]);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 200);
      });

      it('Can primary auto reconcile when bill serial provided - rounded lower amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -298,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 202);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, Fixture.demoAccountantId );
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: -2, account: '`99' }]
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
           [{ amount: 298, account: '`381' }]
        );
      });

      it('Can primary auto reconcile when bill serial provided - rounded higher amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -302,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 200 - 2);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, Fixture.demoAccountantId );
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: 2, account: '`99' }]
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
           [{ amount: 302, account: '`381' }]
        );
      });

      it('Can secondary auto reconcile when bills outstandings match - exact amount', function () {
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -500,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);
        chai.assert.equal(entry.match.confidence, 'info');
        chai.assert.equal(entry.match.tx.category, 'payment');
        chai.assert.equal(entry.match.tx.amount, 500);
        chai.assert.deepEqual(entry.match.tx.bills, [{ id: billId, amount: 300 }, { id: billId2, amount: 200 }]);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 0);
        bill2 = Transactions.findOne(billId2);
        chai.assert.equal(bill2.amount, 200);
        chai.assert.equal(bill2.getPayments().length, 1);
        chai.assert.equal(bill2.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill2.outstanding, 0);
        chai.assert.equal(bill2.partner().outstanding, 0);
      });
    });

    describe('Machine learning', function () {
      let billId, billId2;
      let bill, bill2;
      let entryId, entryId2;
      const bankAccount = '`381';

      before(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        billId2 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          lines: [{
            title: 'The Work A',
            uom: 'piece',
            quantity: 1,
            unitPrice: 50,
            account: '`861',
            localizer: '@',
          }, {
            title: 'The Work B',
            uom: 'piece',
            quantity: 1,
            unitPrice: 150,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId2 });
        bill2 = Transactions.findOne(billId2);
      });
      after(function () {
        Transactions.remove({});
      });

      it('[1] Entry has unknown partner name - will not be auto reconciled', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'SUPPLIER INC - Official name',
          amount: -300,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'danger');
        chai.assert.isUndefined(entry.match.tx.category);
        chai.assert.equal(entry.match.tx.amount, 300);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 0);
      });

      it('[2] ... but can be reconciled by hand', function () {
        const paymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 300,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount,
          partnerId: Fixture.supplier,
          bills: [{ id: billId, amount: 300 }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 1);

        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: paymentId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 200);
      });

      it('[3] Next enrty with same partnerName - will be recognized', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'SUPPLIER INC - Official name',
          amount: -200,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'info');

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 2);

        bill2 = Transactions.findOne(billId2);
        chai.assert.equal(bill2.amount, 200);
        chai.assert.equal(bill2.getPayments().length, 1);
        chai.assert.equal(bill2.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill2.outstanding, 0);
        chai.assert.equal(bill2.partner().outstanding, 0);
      });
    });
  });
}
